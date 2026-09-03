// RSS/Atom と iCal(.ics) の最小パーサ。依存なし。
// 取り込むのは事実（タイトル・日付・会場・リンク）だけ。本文は使わない。

function decodeEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, "&");
}

function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeEntities(m[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

/** RSS2.0 / Atom を [{ title, link, description, published }] に。 */
export function parseFeed(xml) {
  const text = String(xml || "");
  const out = [];

  // RSS <item>
  const items = text.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const it of items) {
    out.push({
      title: pickTag(it, "title"),
      link: pickTag(it, "link") || (it.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || "",
      description: pickTag(it, "description") || pickTag(it, "content:encoded"),
      published: pickTag(it, "pubDate") || pickTag(it, "dc:date"),
    });
  }
  if (out.length) return out;

  // Atom <entry>
  const entries = text.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const en of entries) {
    out.push({
      title: pickTag(en, "title"),
      link: (en.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || pickTag(en, "id"),
      description: pickTag(en, "summary") || pickTag(en, "content"),
      published: pickTag(en, "published") || pickTag(en, "updated"),
    });
  }
  return out;
}

// ---- iCal ----------------------------------------------------------------

function unfoldIcs(text) {
  // RFC5545 の折り返し（改行＋空白）を戻す
  return String(text || "").replace(/\r?\n[ \t]/g, "");
}

function icsValue(line) {
  const i = line.indexOf(":");
  const raw = i < 0 ? "" : line.slice(i + 1);
  return raw
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

// "20260516" / "20260516T190000Z" / "2026-05-16" → "2026-05-16"
function icsDate(line) {
  const v = (line.split(":").pop() || "").trim();
  const m = v.match(/(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

/** VEVENT を [{ summary, start, end, location, url }] に。start は ISO 日付。 */
export function parseIcs(text) {
  const lines = unfoldIcs(text).split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (/^BEGIN:VEVENT/i.test(line)) cur = {};
    else if (/^END:VEVENT/i.test(line)) {
      if (cur && cur.summary && cur.start) events.push(cur);
      cur = null;
    } else if (cur) {
      if (/^SUMMARY[;:]/i.test(line)) cur.summary = icsValue(line);
      else if (/^DTSTART[;:]/i.test(line)) cur.start = icsDate(line);
      else if (/^DTEND[;:]/i.test(line)) cur.end = icsDate(line);
      else if (/^LOCATION[;:]/i.test(line)) cur.location = icsValue(line);
      else if (/^URL[;:]/i.test(line)) cur.url = icsValue(line);
    }
  }
  return events;
}
