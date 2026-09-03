import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed, parseIcs } from "../lib/feed.js";

test("parseFeed: RSS2.0 の item を読む", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title>秋祭り 10月3日開催</title><link>https://ex.jp/a</link>
      <description><![CDATA[<p>会場：福山城公園。10月3日(土)。</p>]]></description>
      <pubDate>Mon, 01 Sep 2026 00:00:00 +0900</pubDate></item>
    <item><title>2つ目</title><link>https://ex.jp/b</link><description>x</description></item>
  </channel></rss>`;
  const items = parseFeed(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "秋祭り 10月3日開催");
  assert.equal(items[0].link, "https://ex.jp/a");
  assert.match(items[0].description, /福山城公園/);
});

test("parseFeed: Atom の entry を読む", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title>展示会 2026年11月1日</title>
      <link href="https://ex.jp/e1"/><summary>要点</summary>
      <updated>2026-08-01T00:00:00Z</updated></entry>
  </feed>`;
  const items = parseFeed(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].link, "https://ex.jp/e1");
  assert.equal(items[0].title, "展示会 2026年11月1日");
});

test("parseIcs: VEVENT を読む（折り返し・エスケープ対応）", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "SUMMARY:福山ばら祭\\, 2026",
    "DTSTART;VALUE=DATE:20260516",
    "DTEND;VALUE=DATE:20260518",
    "LOCATION:福山市中央公園",
    "URL:https://ex.jp/bara",
    "DESCRIPTION:これは無視される長い説明文で",
    " 折り返されている",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const evs = parseIcs(ics);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].summary, "福山ばら祭, 2026");
  assert.equal(evs[0].start, "2026-05-16");
  assert.equal(evs[0].end, "2026-05-18");
  assert.equal(evs[0].location, "福山市中央公園");
  assert.equal(evs[0].url, "https://ex.jp/bara");
});

test("parseIcs: SUMMARY か DTSTART が無い VEVENT は捨てる", () => {
  const ics = "BEGIN:VEVENT\nSUMMARY:日付なし\nEND:VEVENT";
  assert.deepEqual(parseIcs(ics), []);
});
