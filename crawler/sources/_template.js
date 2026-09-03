/**
 * サイト追加用テンプレート。
 * このファイルをコピーして sources/<site>.js を作り、sources/index.js に登録する。
 *
 * 追加の前に必ず確認すること:
 *   1. そのサイトの robots.txt（クロール可否）
 *   2. 利用規約・引用/転載に関する記載
 *   3. RSS / iCal / API / オープンデータが提供されていないか（あればそちらを優先）
 *
 * 保存してよいのは「名称・日時・会場・エリア・出典URL＋短い要約」まで。
 * 本文の全文コピーや画像の保存・ホットリンクはしない。
 */

// import * as cheerio から渡される $ を使ってDOMを読む
export default {
  name: "サンプルサイト イベント情報",

  // 一覧ページ（複数可。ページネーションがあれば ?page=2 なども並べる）
  listUrls: ["https://example.jp/events/"],

  // このサイトが単一エリア専門なら指定（例 "笠岡"）。null なら会場から自動判定。
  areaHint: null,

  // 一覧ページから詳細ページの絶対URLを集める
  collectDetailLinks($, pageUrl) {
    const base = new URL(pageUrl);
    const urls = new Set();
    $(".event-list a.event-link").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        urls.add(new URL(href, base).toString());
      } catch {
        /* 無効なURLは無視 */
      }
    });
    return [...urls];
  },

  // 詳細ページから最小限のフィールドを抽出（任意）。
  // 返さない / null の場合は run.js が JSON-LD 抽出にフォールバックする。
  parseDetail($, url /*, html */) {
    const name = $("h1").first().text().trim();
    if (!name) return null;
    return {
      name,
      dateText: $(".event-date").first().text().trim(), // 例: "2026年5月16日(土)〜17日(日)"
      venue: $(".event-venue").first().text().trim(),
      address: $(".event-address").first().text().trim(),
      time: $(".event-time").first().text().trim(),
      fee: $(".event-fee").first().text().trim(),
      organizer: $(".event-organizer").first().text().trim(),
      // 要約は自分の言葉で数文に圧縮する。原文をそのまま入れない。
      summary: $('meta[name="description"]').attr("content") || "",
      description: $('meta[name="description"]').attr("content") || "",
      sourceUrl: url,
    };
  },
};
