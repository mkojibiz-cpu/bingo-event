import * as cheerio from "cheerio";

/**
 * ページ内の JSON-LD から schema.org/Event ノードを取り出す。
 * 多くの自治体・観光系 CMS が Event 構造化データを出力しており、
 * サイトごとの CSS セレクタより安定して取得できる。
 */
export function extractJsonLdEvents(html) {
  const $ = cheerio.load(html);
  const events = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    for (const node of flatten(parsed)) {
      if (isEvent(node)) events.push(node);
    }
  });
  return events;
}

function flatten(data) {
  const queue = Array.isArray(data) ? [...data] : [data];
  const out = [];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    out.push(node);
    if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
  }
  return out;
}

function isEvent(node) {
  const t = node && node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /event$/i.test(x.replace(/.*[\/#]/, "")));
}

/** JSON-LD Event ノード → クローラ内部の raw 形式 */
export function jsonLdEventToRaw(node, pageUrl) {
  const loc = node.location || {};
  const addr = loc.address;
  const address =
    typeof addr === "string"
      ? addr
      : addr && typeof addr === "object"
        ? [addr.addressRegion, addr.addressLocality, addr.streetAddress].filter(Boolean).join("")
        : "";

  const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
  let fee = "";
  if (offers) {
    if (offers.price === 0 || offers.price === "0" || /free/i.test(offers.category || "")) fee = "無料";
    else if (offers.price != null) fee = `${offers.price}${offers.priceCurrency === "JPY" || !offers.priceCurrency ? "円" : " " + offers.priceCurrency}`;
  }

  const organizer =
    (node.organizer && (node.organizer.name || node.organizer)) ||
    (node.performer && (node.performer.name || node.performer)) ||
    "";

  return {
    sourceUrl: node.url || pageUrl,
    name: text(node.name),
    startDate: typeof node.startDate === "string" ? node.startDate : "",
    endDate: typeof node.endDate === "string" ? node.endDate : "",
    dateText: "",
    venue: text(loc.name),
    address: text(address),
    time: "",
    fee: text(fee),
    organizer: text(organizer),
    description: text(node.description),
    summary: text(node.description),
  };
}

function text(v) {
  if (v == null) return "";
  if (typeof v === "object") return String(v.name || "").trim();
  return String(v).replace(/\s+/g, " ").trim();
}
