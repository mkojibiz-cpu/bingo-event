// 全ソースを実行して data/events.js と sitemap.xml を再生成する。
//
//   node run.js
//
// - 1つのソースが失敗しても他は続行し、取れた分は書き出す
// - 既存 events.js の crawledAt は維持（=「新着」枠が機能する）
// - まだ一覧に残すべき既存イベントは、クロールに失敗しても保持する
// - data/manual.json の exclude / overrides / pins / additional を最後に適用

import * as cheerio from "cheerio";
import { sources } from "./sources/index.js";
import { fetchText } from "./lib/fetch.js";
import { isAllowed } from "./lib/robots.js";
import { extractJsonLdEvents, jsonLdEventToRaw } from "./lib/extract.js";
import { normalizeEvent, ymd } from "./lib/normalize.js";
import { dedupe, mergePair } from "./lib/dedupe.js";
import {
  readPreviousEvents,
  readManual,
  writeEventsFile,
  writeSitemap,
} from "./lib/store.js";
import { KEEP_DAYS_AFTER_END } from "./config.js";

const DRY_RUN = process.argv.includes("--dry-run");
const warn = (m) => {
  console.log(`::warning::${m}`);
};
const endOf = (e) => e.endDate || e.date;

async function crawlSource(source, today) {
  // 詳細URLを集める
  const detailUrls = new Set();
  for (const listUrl of source.listUrls) {
    if (!(await isAllowed(listUrl))) {
      warn(`${source.name}: robots.txt により不許可 (${listUrl})`);
      continue;
    }
    const html = await fetchText(listUrl);
    const $ = cheerio.load(html);
    for (const u of source.collectDetailLinks($, listUrl)) detailUrls.add(u);
  }

  const events = [];
  for (const url of detailUrls) {
    if (!(await isAllowed(url))) continue;
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      warn(`${source.name}: 取得失敗 ${url} — ${e.message}`);
      continue;
    }
    const $ = cheerio.load(html);

    const raws = [];
    if (typeof source.parseDetail === "function") {
      try {
        const r = source.parseDetail($, url, html);
        if (r) raws.push({ ...r, sourceUrl: r.sourceUrl || url });
      } catch (e) {
        warn(`${source.name}: parseDetail 失敗 ${url} — ${e.message}`);
      }
    }
    for (const node of extractJsonLdEvents(html)) raws.push(jsonLdEventToRaw(node, url));

    for (const raw of raws) {
      const ev = normalizeEvent(raw, { areaHint: source.areaHint, today });
      if (ev) events.push(ev);
    }
  }
  return dedupe(events);
}

async function main() {
  const today = new Date();
  const prev = readPreviousEvents();
  const prevById = new Map(prev.map((e) => [e.id, e]));

  // 1) 全ソースを実行
  const fresh = [];
  const report = [];
  if (sources.length === 0) {
    warn(
      "有効なソースが0件です。crawler/sources/index.js にサイトを追加してください（今回は既存データを保持します）"
    );
  }
  for (const source of sources) {
    try {
      const evs = await crawlSource(source, today);
      report.push({ name: source.name, count: evs.length, ok: true });
      fresh.push(...evs);
    } catch (e) {
      report.push({ name: source.name, count: 0, ok: false, error: e.message });
      warn(`${source.name}: 実行失敗 — ${e.message}`);
    }
  }

  // 2) 既存の crawledAt を引き継ぎ
  for (const ev of fresh) {
    const p = prevById.get(ev.id);
    if (p?.crawledAt) ev.crawledAt = p.crawledAt;
  }

  // 3) マージ: まだ残すべき既存 + 今回取得（今回分で上書き）
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS_AFTER_END);
  const merged = new Map();
  for (const e of prev) {
    if (new Date(endOf(e)) >= cutoff) merged.set(e.id, e);
  }
  for (const e of fresh) {
    merged.set(e.id, merged.has(e.id) ? mergePair(merged.get(e.id), e) : e);
  }

  // 4) 人手の調整 (data/manual.json)
  const manual = readManual();
  for (const e of manual.additional) if (e.id) merged.set(e.id, e);
  for (const [id, patch] of Object.entries(manual.overrides)) {
    if (merged.has(id)) merged.set(id, { ...merged.get(id), ...patch });
  }
  for (const id of manual.exclude) merged.delete(id);
  for (const id of manual.pins) if (merged.has(id)) merged.get(id).featured = true;

  // 5) 期限切れを除去 → 安定した並びで書き出し
  const list = [...merged.values()]
    .filter((e) => new Date(endOf(e)) >= cutoff)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));

  if (DRY_RUN) {
    console.log(`\n[dry-run] 書き込みなし。生成されるイベント件数: ${list.length}`);
  } else {
    writeEventsFile(list);
    writeSitemap(list);
  }

  // 6) サマリ
  console.log("\n=== クロール結果 ===");
  for (const r of report) {
    console.log(`  ${r.ok ? "OK  " : "NG  "} ${r.name} : ${r.ok ? r.count + "件" : r.error}`);
  }
  const added = list.filter((e) => e.crawledAt === ymd(today)).length;
  console.log(`  -----`);
  console.log(`  今回の新規: ${added}件 / 合計: ${list.length}件`);
  console.log(
    DRY_RUN
      ? `  [dry-run] ファイルは変更していません。`
      : `  data/events.js と sitemap.xml を更新しました。`
  );

  const allFailed = report.length > 0 && report.every((r) => !r.ok);
  if (allFailed) {
    console.log("::error::すべてのソースが失敗しました");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.log(`::error::run.js が異常終了: ${e.stack || e.message}`);
  process.exit(1);
});
