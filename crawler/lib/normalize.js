import { parseJpDate, toDateText } from "./date.js";
import { eventId } from "./slug.js";
import { AREAS } from "../config.js";

export function ymd(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 会場・住所・名称などから対象エリアのラベルを判定。対象外なら null。 */
export function detectArea(...texts) {
  const hay = texts.filter(Boolean).join(" ").normalize("NFKC");
  for (const a of AREAS) {
    if (a.keywords.some((k) => hay.includes(k))) return a.label;
  }
  return null;
}

function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * 取得した raw を、サイト共通スキーマの1件に整える。
 * 日付が取れない / 対象エリア外 / 名称や出典が無い場合は null（=不採用）。
 *
 * 方針: 保存するのは「名称・日時・会場・エリア・出典＋短い要約」まで。
 *       本文の全文転載はしない（description も数文に圧縮）。
 */
export function normalizeEvent(raw, { areaHint = null, today = new Date() } = {}) {
  const name = clip(raw.name, 80);
  if (!name || !raw.sourceUrl) return null;

  let date = null;
  let endDate = null;
  let dateText = raw.dateText || "";

  if (raw.startDate && /^\d{4}-\d{2}-\d{2}/.test(raw.startDate)) {
    date = raw.startDate.slice(0, 10);
    endDate = raw.endDate ? raw.endDate.slice(0, 10) : null;
  } else if (raw.dateText) {
    const parsed = parseJpDate(raw.dateText, today);
    if (parsed) {
      date = parsed.date;
      endDate = parsed.endDate;
    }
  }
  if (!date) return null;
  if (endDate === date) endDate = null;
  if (!dateText) dateText = toDateText(date, endDate);

  // エリア判定は「名称・会場・住所」だけで行う。
  // 要約/本文は観光コピーで地名がゆるく出てくる（例:「瀬戸内海」）ため使わない。
  const area = areaHint || detectArea(name, raw.venue, raw.address);
  if (!area) return null;

  const event = {
    id: eventId(area, date, name),
    name,
    area,
    date,
    dateText,
    image: "",
    summary: clip(raw.summary || raw.description, 120),
    description: clip(raw.description || raw.summary, 220),
    sourceUrl: raw.sourceUrl,
    crawledAt: ymd(today),
    featured: false,
  };
  if (endDate) event.endDate = endDate;
  const venue = clip(raw.venue, 80);
  const address = clip(raw.address, 120);
  const time = clip(raw.time, 60);
  const fee = clip(raw.fee, 60);
  const organizer = clip(raw.organizer, 80);
  if (venue) event.venue = venue;
  if (address) event.address = address;
  if (time) event.time = time;
  if (fee) event.fee = fee;
  if (organizer) event.organizer = organizer;

  return event;
}
