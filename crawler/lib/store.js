import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SITE_ORIGIN } from "../config.js";

const EVENTS_FILE = fileURLToPath(new URL("../../data/events.js", import.meta.url));
const SITEMAP_FILE = fileURLToPath(new URL("../../sitemap.xml", import.meta.url));
const MANUAL_FILE = fileURLToPath(new URL("../../data/manual.json", import.meta.url));

/** `window.EVENTS = [...]` 形式のテキストから配列を取り出す純粋関数。 */
export function parseEventsJs(txt) {
  const m = String(txt || "").match(/window\.EVENTS\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!m) return [];
  try {
    return JSON.parse(m[1]);
  } catch {
    return [];
  }
}

/** 既存の data/events.js から window.EVENTS 配列を読む（失敗時は []）。 */
export function readPreviousEvents() {
  try {
    return parseEventsJs(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

/** data/manual.json（人手の上書き・固定・除外・追加）を読む。 */
export function readManual() {
  try {
    const j = JSON.parse(fs.readFileSync(MANUAL_FILE, "utf8"));
    return {
      exclude: j.exclude ?? [],
      pins: j.pins ?? [],
      overrides: j.overrides ?? {},
      additional: j.additional ?? [],
    };
  } catch {
    return { exclude: [], pins: [], overrides: {}, additional: [] };
  }
}

export function writeEventsFile(events) {
  const banner =
    `/* 自動生成ファイル — 直接編集しないでください。\n` +
    ` * 生成: crawler/run.js   最終生成: ${new Date().toISOString()}\n` +
    ` * 追加・修正・固定表示・除外は data/manual.json で行います。\n` +
    ` */\n`;
  fs.writeFileSync(
    EVENTS_FILE,
    banner + "window.EVENTS = " + JSON.stringify(events, null, 2) + ";\n"
  );
}

export function writeSitemap(events) {
  const urls = [
    `${SITE_ORIGIN}/`,
    ...events.map((e) => `${SITE_ORIGIN}/detail.html?id=${encodeURIComponent(e.id)}`),
  ];
  const body = urls
    .map(
      (u, i) =>
        `  <url>\n    <loc>${u}</loc>\n` +
        (i === 0 ? `    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n` : `    <changefreq>weekly</changefreq>\n`) +
        `  </url>`
    )
    .join("\n");
  fs.writeFileSync(
    SITEMAP_FILE,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!-- crawler/run.js が生成 -->\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  );
}
