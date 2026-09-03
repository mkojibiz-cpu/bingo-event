import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEvent, detectArea } from "../lib/normalize.js";

const TODAY = new Date("2026-09-03T00:00:00+09:00");

test("detectArea: 会場名から福山を判定", () => {
  assert.equal(detectArea("○○祭", "福山城公園", "広島県福山市丸之内"), "福山");
});

test("detectArea: 神辺は福山より先に判定される", () => {
  assert.equal(detectArea("菊花展", "神辺本陣", "福山市神辺町"), "神辺");
});

test("detectArea: 対象外は null", () => {
  assert.equal(detectArea("広島市民祭", "広島市中区"), null);
});

test("normalizeEvent: 日本語日付＋会場から1件を構成", () => {
  const ev = normalizeEvent(
    {
      name: "福山ばら祭",
      dateText: "2026年5月16日(土)〜17日(日)",
      venue: "福山市中央公園",
      address: "広島県福山市霞町",
      sourceUrl: "https://example.jp/e/1",
      description: "  ばらのまち福山の市民祭。   ",
      summary: "100万本のばら",
    },
    { today: TODAY }
  );
  assert.equal(ev.area, "福山");
  assert.equal(ev.date, "2026-05-16");
  assert.equal(ev.endDate, "2026-05-17");
  assert.equal(ev.image, "");
  assert.equal(ev.featured, false);
  assert.equal(ev.crawledAt, "2026-09-03");
  assert.ok(ev.id.startsWith("20260516-"));
  // 事実情報のみ：クロール由来の紹介文は取り込まない
  assert.equal(ev.description, "");
  assert.equal(ev.summary, "");
});

test("normalizeEvent: startDate(ISO)も受け付ける", () => {
  const ev = normalizeEvent(
    {
      name: "尾道灯りまつり",
      startDate: "2026-10-03T18:00:00+09:00",
      venue: "千光寺参道",
      sourceUrl: "https://example.jp/e/2",
    },
    { today: TODAY }
  );
  assert.equal(ev.area, "尾道");
  assert.equal(ev.date, "2026-10-03");
  assert.equal(ev.endDate, undefined);
});

test("normalizeEvent: 日付なしは不採用", () => {
  assert.equal(
    normalizeEvent(
      { name: "日程未定イベント", dateText: "近日公開", venue: "福山市", sourceUrl: "https://x/y" },
      { today: TODAY }
    ),
    null
  );
});

test("normalizeEvent: 対象エリア外は不採用", () => {
  assert.equal(
    normalizeEvent(
      { name: "岡山イベント", dateText: "2026年10月1日", venue: "岡山市北区", sourceUrl: "https://x/y" },
      { today: TODAY }
    ),
    null
  );
});

test("normalizeEvent: sourceUrl 無しは不採用", () => {
  assert.equal(
    normalizeEvent(
      { name: "テスト", dateText: "2026年10月1日", venue: "福山市" },
      { today: TODAY }
    ),
    null
  );
});

test("normalizeEvent: areaHint を優先", () => {
  const ev = normalizeEvent(
    { name: "島の催し", dateText: "2026年11月1日", venue: "北木島", sourceUrl: "https://x/y" },
    { areaHint: "笠岡", today: TODAY }
  );
  assert.equal(ev.area, "笠岡");
});
