// 同一 ID のイベントをまとめる。フィールドが充実している方を優先しつつ、
// 欠けている項目は他方で補完。crawledAt は最も古いものを残す（=新着判定用）。

const FILL_KEYS = [
  "summary",
  "description",
  "venue",
  "address",
  "time",
  "fee",
  "organizer",
  "endDate",
];

function richness(e) {
  return FILL_KEYS.reduce((n, k) => n + (e[k] ? 1 : 0), 0);
}

export function mergePair(a, b) {
  const bWins = richness(b) > richness(a);
  const winner = bWins ? b : a;
  const loser = bWins ? a : b;
  const out = { ...winner };
  for (const k of FILL_KEYS) {
    if (!out[k] && loser[k]) out[k] = loser[k];
  }
  out.crawledAt =
    a.crawledAt && b.crawledAt ? (a.crawledAt < b.crawledAt ? a.crawledAt : b.crawledAt) : a.crawledAt || b.crawledAt;
  return out;
}

export function dedupe(events) {
  const byId = new Map();
  for (const ev of events) {
    if (!ev || !ev.id) continue;
    const existing = byId.get(ev.id);
    byId.set(ev.id, existing ? mergePair(existing, ev) : ev);
  }
  return [...byId.values()];
}
