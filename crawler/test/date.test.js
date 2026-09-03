import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJpDate, toDateText } from "../lib/date.js";

const TODAY = new Date("2026-09-03T00:00:00+09:00");

test("2026年5月16日(土)", () => {
  assert.deepEqual(parseJpDate("2026年5月16日(土)", TODAY), {
    date: "2026-05-16",
    endDate: null,
  });
});

test("2026年5月16日(土)〜17日(日) 同月レンジ", () => {
  assert.deepEqual(parseJpDate("2026年5月16日(土)〜17日(日)", TODAY), {
    date: "2026-05-16",
    endDate: "2026-05-17",
  });
});

test("2026年5月16日〜6月2日 月またぎ", () => {
  assert.deepEqual(parseJpDate("2026年5月16日〜6月2日", TODAY), {
    date: "2026-05-16",
    endDate: "2026-06-02",
  });
});

test("2026年12月30日～2027年1月3日 年またぎ(フル表記)", () => {
  assert.deepEqual(parseJpDate("2026年12月30日～2027年1月3日", TODAY), {
    date: "2026-12-30",
    endDate: "2027-01-03",
  });
});

test("スラッシュ表記 2026/10/03", () => {
  assert.deepEqual(parseJpDate("2026/10/03", TODAY), {
    date: "2026-10-03",
    endDate: null,
  });
});

test("年省略 10月10日 は基準日以降なら当年", () => {
  assert.deepEqual(parseJpDate("10月10日", TODAY), {
    date: "2026-10-10",
    endDate: null,
  });
});

test("年省略 1月1日 は基準日から見て過去すぎるので翌年", () => {
  assert.deepEqual(parseJpDate("1月1日", TODAY), {
    date: "2027-01-01",
    endDate: null,
  });
});

test("パースできない文字列は null", () => {
  assert.equal(parseJpDate("日程未定", TODAY), null);
});

test("toDateText はレンジを 〜 でつなぐ", () => {
  assert.equal(toDateText("2026-05-16", "2026-05-17"), "2026年5月16日〜2026年5月17日");
  assert.equal(toDateText("2026-05-16", null), "2026年5月16日");
});
