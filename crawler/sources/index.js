/**
 * 有効なクロール対象の一覧。ここに追加すると毎日のクロール対象になる。
 * 追加前に必ず robots.txt と利用規約を確認すること（_template.js のコメント参照）。
 *
 * ソースの型は2つ:
 *   - クロール型  { listUrls, collectDetailLinks, parseDetail }
 *   - フィード型  { fetchRaws(ctx) }  … RSS / iCal / API
 *
 * 取り込むのは事実だけ（名称・日時・会場・住所・時間・料金・主催・出典リンク）。
 * 紹介文・写真は取り込まない。
 *
 * 壊れたソースを一時停止したいときは、その行をコメントアウトするだけでよい。
 */
import diveHiroshima from "./dive-hiroshima.js";
import { rssSource } from "./rss.js";
// import { icalSource } from "./ical.js";
// import connpass from "./connpass.js";

export const sources = [
  diveHiroshima,

  // 備後圏域6市2町の公式ポータル「びんごライフ」のイベントカテゴリRSS
  rssSource({
    name: "びんごライフ イベント（RSS）",
    feedUrls: ["https://bingolife.jp/news/news_tax/event/feed/"],
    areaHint: null,
  }),

  // ── 追加候補 ───────────────────────────────────────────────
  // connpass（要 CONNPASS_API_KEY）。キーを用意したら有効化:
  //   connpass,
  //
  // 公開Googleカレンダー等の iCal を持つ主催者が見つかったら:
  //   icalSource({ name: "◯◯実行委 カレンダー", icsUrls: ["https://.../basic.ics"], areaHint: "福山" }),
  //
  // 各団体サイトの RSS（多くの WordPress サイトは /feed/ を持つ）:
  //   rssSource({ name: "◯◯協会 お知らせ（RSS）", feedUrls: ["https://example.jp/feed/"], areaHint: "尾道" }),
  //
  // まいぷれ福山 https://fukuyama.mypl.net/event/  … robots は許可だが Crawl-delay 90秒。
  //   接続する場合は minDelayMs: 90000 を付け、利用規約（事実＋出典リンクのみ）を運営者が確認のうえで。
];
