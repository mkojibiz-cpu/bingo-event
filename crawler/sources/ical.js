import { parseIcs } from "../lib/feed.js";

/**
 * 公開 iCal(.ics) を取り込むソース。DTSTART など構造化されているので確実。
 *
 *   icalSource({
 *     name: "◯◯ 公開カレンダー",
 *     icsUrls: ["https://calendar.google.com/calendar/ical/xxxxx/public/basic.ics"],
 *     areaHint: null,
 *   })
 *
 * 取り込むのは SUMMARY(名称) / DTSTART・DTEND(日付) / LOCATION(会場) / URL のみ。
 * DESCRIPTION は使わない。
 */
export function icalSource({ name, icsUrls, areaHint = null }) {
  return {
    name,
    areaHint,
    async fetchRaws(ctx) {
      const raws = [];
      for (const url of icsUrls) {
        let text;
        try {
          text = await ctx.fetchText(url);
        } catch (e) {
          ctx.warn(`${name}: iCal取得失敗 ${url} — ${e.message}`);
          continue;
        }
        for (const ev of parseIcs(text)) {
          raws.push({
            sourceUrl: ev.url || url,
            name: ev.summary,
            startDate: ev.start,
            endDate: ev.end || "",
            venue: ev.location || "",
          });
        }
      }
      return raws;
    },
  };
}
