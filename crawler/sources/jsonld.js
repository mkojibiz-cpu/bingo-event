/**
 * JSON-LD（schema.org/Event 構造化データ）を出力しているサイト向けの汎用ソース。
 * 一覧ページから detailLinkPattern にマッチするリンクを集め、
 * 各ページの JSON-LD を run.js 側で抽出する（サイト固有のセレクタ不要）。
 *
 * 使い方（sources/index.js）:
 *   jsonLdSource({
 *     name: "◯◯観光協会 イベント",
 *     listUrls: ["https://example.jp/events/"],
 *     detailLinkPattern: /\/events\/\d+/,
 *     areaHint: null,           // 市単位サイトなら "笠岡" などを指定
 *   })
 */
export function jsonLdSource({
  name,
  listUrls,
  detailLinkPattern,
  sameHostOnly = true,
  areaHint = null,
  maxDetails = 120,
}) {
  return {
    name,
    listUrls,
    areaHint,
    collectDetailLinks($, pageUrl) {
      const base = new URL(pageUrl);
      const found = new Set();
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        let u;
        try {
          u = new URL(href, base);
        } catch {
          return;
        }
        if (sameHostOnly && u.host !== base.host) return;
        u.hash = "";
        const s = u.toString();
        if (detailLinkPattern.test(s)) found.add(s);
      });
      return [...found].slice(0, maxDetails);
    },
  };
}
