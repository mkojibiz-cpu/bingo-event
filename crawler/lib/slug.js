import { createHash } from "node:crypto";

// イベントの一意ID。エリア・開催日・名称が変わらない限り安定する。
// 例: "20260516-1a2b3c4d5e"
export function eventId(area, date, name) {
  const key = `${area}|${date}|${name}`.normalize("NFKC").trim();
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 10);
  const d = (date || "0000-00-00").replace(/-/g, "");
  return `${d}-${hash}`;
}
