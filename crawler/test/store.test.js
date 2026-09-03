import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEventsJs } from "../lib/store.js";

test("parseEventsJs: バナーコメント付きの events.js を読める", () => {
  const txt = `/* 自動生成ファイル */\nwindow.EVENTS = [\n  { "id": "a", "name": "祭り", "date": "2026-10-01" }\n];\n`;
  const arr = parseEventsJs(txt);
  assert.equal(arr.length, 1);
  assert.equal(arr[0].id, "a");
});

test("parseEventsJs: 壊れた内容なら空配列", () => {
  assert.deepEqual(parseEventsJs("window.EVENTS = [ oops"), []);
  assert.deepEqual(parseEventsJs(""), []);
  assert.deepEqual(parseEventsJs("const x = 1;"), []);
});
