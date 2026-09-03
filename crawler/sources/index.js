/**
 * 有効なクロール対象サイトの一覧。
 *
 * ここに追加すると毎日のクロール対象になる。追加前に必ず
 * robots.txt と利用規約を確認すること（詳しくは _template.js のコメント）。
 *
 * サイトが JSON-LD(Event 構造化データ) を出しているなら jsonLdSource が手軽。
 * そうでなければ _template.js をコピーして CSS セレクタ／埋め込みJSON で抽出する。
 *
 * 壊れたサイトを一時停止したいときは、その要素を配列から外す（コメントアウト）だけでよい。
 */
import diveHiroshima from "./dive-hiroshima.js";
// import { jsonLdSource } from "./jsonld.js";

export const sources = [
  diveHiroshima,

  // ── 追加候補（未接続）────────────────────────────────────────────
  // ・まいぷれ福山 https://fukuyama.mypl.net/event/  … robots は許可だが
  //   Crawl-delay: 90 秒。fetch.js に crawl-delay 対応を足してから接続する。
  // ・福山市公式「えっと福山」/ 各市の観光協会 … 構造化データが無く要個別実装。
];
