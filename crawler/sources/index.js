/**
 * 有効なクロール対象サイトの一覧。
 *
 * ここに追加すると毎日のクロール対象になる。追加前に必ず
 * robots.txt と利用規約を確認すること（詳しくは _template.js のコメント）。
 *
 * サイトが JSON-LD(Event 構造化データ) を出しているなら jsonLdSource が手軽。
 * そうでなければ _template.js をコピーして CSS セレクタで抽出する。
 *
 * 壊れたサイトを一時停止したいときは、その要素を配列から外す（コメントアウト）だけでよい。
 */
import { jsonLdSource } from "./jsonld.js";

export const sources = [
  // ── 有効化の例（URL とリンクパターンを実サイトに合わせてから外す）──────────
  //
  // jsonLdSource({
  //   name: "福山観光ナビ イベント",
  //   listUrls: ["https://www.fukuyama-kanko.com/events"],
  //   detailLinkPattern: /\/events\/[0-9]+/,
  //   areaHint: null,
  // }),
  //
  // jsonLdSource({
  //   name: "かさおか観光ポータル イベント",
  //   listUrls: ["https://www.kasaoka-kanko.jp/event/"],
  //   detailLinkPattern: /\/event\/[^/]+\/?$/,
  //   areaHint: "笠岡",
  // }),
  //
  // jsonLdSource({
  //   name: "おのみち観光協会 イベント",
  //   listUrls: ["https://www.ononavi.jp/event/"],
  //   detailLinkPattern: /\/event\/[0-9]+/,
  //   areaHint: "尾道",
  // }),
];
