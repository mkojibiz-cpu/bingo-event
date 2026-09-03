import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJsonLdEvents, jsonLdEventToRaw } from "../lib/extract.js";
import { normalizeEvent } from "../lib/normalize.js";

const TODAY = new Date("2026-09-03T00:00:00+09:00");

const HTML = `<!doctype html><html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "name": "無関係" },
    {
      "@type": "Event",
      "name": "笠岡諸島アートフェスティバル",
      "startDate": "2026-10-10",
      "endDate": "2026-11-08",
      "url": "https://example.jp/event/999",
      "location": {
        "@type": "Place",
        "name": "白石島ほか",
        "address": { "@type": "PostalAddress", "addressRegion": "岡山県", "addressLocality": "笠岡市" }
      },
      "offers": { "@type": "Offer", "price": 0, "priceCurrency": "JPY" },
      "organizer": { "@type": "Organization", "name": "実行委員会" },
      "description": "笠岡諸島を舞台にした現代アートの回遊展。"
    }
  ]
}
</script></head><body></body></html>`;

test("extractJsonLdEvents: @graph 内の Event を1件取り出す", () => {
  const nodes = extractJsonLdEvents(HTML);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].name, "笠岡諸島アートフェスティバル");
});

test("jsonLdEventToRaw → normalizeEvent が通る", () => {
  const raw = jsonLdEventToRaw(extractJsonLdEvents(HTML)[0], "https://example.jp/event/999");
  assert.equal(raw.fee, "無料");
  assert.equal(raw.organizer, "実行委員会");

  const ev = normalizeEvent(raw, { today: TODAY });
  assert.equal(ev.area, "笠岡");
  assert.equal(ev.date, "2026-10-10");
  assert.equal(ev.endDate, "2026-11-08");
  assert.equal(ev.fee, "無料");
  assert.equal(ev.sourceUrl, "https://example.jp/event/999");
});

test("不正な JSON-LD は無視される", () => {
  assert.deepEqual(extractJsonLdEvents('<script type="application/ld+json">{ bad json</script>'), []);
});
