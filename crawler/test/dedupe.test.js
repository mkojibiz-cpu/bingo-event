import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupe, mergePair } from "../lib/dedupe.js";

test("dedupe: 同一IDはまとめられ、欠けた項目を補完", () => {
  const a = {
    id: "x1",
    name: "祭り",
    date: "2026-10-01",
    crawledAt: "2026-09-01",
    venue: "福山城公園",
  };
  const b = {
    id: "x1",
    name: "祭り",
    date: "2026-10-01",
    crawledAt: "2026-09-10",
    organizer: "実行委員会",
    summary: "秋の祭り",
  };
  const [merged] = dedupe([a, b]);
  assert.equal(merged.venue, "福山城公園");
  assert.equal(merged.organizer, "実行委員会");
  assert.equal(merged.summary, "秋の祭り");
  // crawledAt は古い方を保持
  assert.equal(merged.crawledAt, "2026-09-01");
});

test("mergePair: 情報量の多い方をベースにする", () => {
  const poor = { id: "y", name: "A", date: "2026-10-01", crawledAt: "2026-09-01" };
  const rich = {
    id: "y",
    name: "A",
    date: "2026-10-01",
    crawledAt: "2026-09-02",
    venue: "V",
    address: "AD",
    time: "10:00",
    fee: "無料",
  };
  const m = mergePair(poor, rich);
  assert.equal(m.venue, "V");
  assert.equal(m.fee, "無料");
});

test("dedupe: 別IDはそのまま残る", () => {
  const list = dedupe([
    { id: "a", name: "1", date: "2026-10-01", crawledAt: "2026-09-01" },
    { id: "b", name: "2", date: "2026-10-02", crawledAt: "2026-09-01" },
  ]);
  assert.equal(list.length, 2);
});
