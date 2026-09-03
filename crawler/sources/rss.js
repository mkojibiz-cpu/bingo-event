import { parseFeed } from "../lib/feed.js";

/**
 * RSS/Atom フィードから事実だけ拾うソース。
 *
 *   rssSource({
 *     name: "◯◯ イベント（RSS）",
 *     feedUrls: ["https://example.jp/category/event/feed/"],
 *     areaHint: null,          // 単一市のフィードなら "府中" など
 *   })
 *
 * RSS の item には「開催日」欄が無いことが多いので、日付は
 * タイトル＋説明文から parseJpDate で拾う（拾えなければ不採用）。
 * 説明文そのものは保存しない（normalize が summary/description を空にする）。
 */
export function rssSource({ name, feedUrls, areaHint = null }) {
  return {
    name,
    areaHint,
    async fetchRaws(ctx) {
      const raws = [];
      for (const url of feedUrls) {
        let xml;
        try {
          xml = await ctx.fetchText(url);
        } catch (e) {
          ctx.warn(`${name}: フィード取得失敗 ${url} — ${e.message}`);
          continue;
        }
        for (const item of parseFeed(xml)) {
          if (!item.title || !item.link) continue;
          raws.push({
            sourceUrl: item.link,
            name: item.title,
            // 日付を拾うためだけの自由文（表示・保存はされない）
            dateSource: `${item.title} ${String(item.description || "").replace(/<[^>]+>/g, " ")}`,
          });
        }
      }
      return raws;
    },
  };
}
