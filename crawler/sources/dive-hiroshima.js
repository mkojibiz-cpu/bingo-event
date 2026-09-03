/**
 * ひろしま公式観光サイト「Dive! Hiroshima」のイベント情報。
 * https://dive-hiroshima.com/events/
 *
 * - robots.txt は全許可（2026-09 時点で確認。Disallow なし）
 * - 広島県・広島観光連盟が運営する公式サイト
 * - ページは Next.js 製。各ページ埋め込みの <script id="__NEXT_DATA__"> に
 *   構造化データ（日付・会場・料金・問い合わせ等）が入っているのでそれを使う
 *   （表示用の CSS クラスはハッシュ化されていて不安定なため）
 * - エリアは会場名から自動判定（areaHint: null）。備後（福山・笠岡・尾道・
 *   府中・神辺）に該当しないイベントは normalize 側で除外される
 * - 取得するのは「事実情報」のみ：名称・日時・会場・住所・時間・料金・主催・
 *   出典リンク。説明文やキャッチコピー、写真は取得しない（著作権に配慮）。
 *   紹介文が要るときは data/manual.json に自分の言葉で書く。
 */

const FRONT = "https://dive-hiroshima.com";

function nextData(html) {
  const m = String(html || "").match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function pageData(html) {
  const d = nextData(html);
  return d && d.props && d.props.pageProps && d.props.pageProps.data;
}

// "2026.07.18" / "2026/07/18" / "2026-07-18" → "2026-07-18"
function isoDate(s) {
  const m = String(s || "").match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
  if (!m) return "";
  const p = (n) => (n < 10 ? "0" : "") + n;
  return m[1] + "-" + p(+m[2]) + "-" + p(+m[3]);
}

function stripTags(s) {
  return String(s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// cms.dive-hiroshima.com/events/events-123/ → dive-hiroshima.com/events/events-123/
function frontUrl(u) {
  const m = String(u || "").match(/\/events\/events-(\d+)\/?/);
  return m ? FRONT + "/events/events-" + m[1] + "/" : "";
}

export default {
  name: "Dive! Hiroshima イベント",
  listUrls: [FRONT + "/events/"],
  areaHint: null,

  collectDetailLinks($, pageUrl, html) {
    const data = pageData(html);
    const posts = data && data.list_data && data.list_data.posts;
    if (!Array.isArray(posts)) return [];
    const urls = [];
    for (const p of posts) {
      const u = frontUrl(p && p.url);
      if (u) urls.push(u);
    }
    return urls;
  },

  parseDetail($, url, html) {
    const d = pageData(html);
    if (!d) return null;

    const bd = d.base_data || {};
    const i2 = d.info2_data || {};
    const acc = d.access_data || {};

    const name = (d.meta && d.meta.title) || "";
    if (!name) return null;

    const period = bd.search_event_date || (bd.event_date && bd.event_date[0]) || {};
    const start = isoDate(period.start_date);
    if (!start) return null;
    const end = isoDate(period.end_date);

    // 事実情報のみ。説明文・キャッチコピー（info.*, bd.sub_title 等）は取らない。
    return {
      sourceUrl: url,
      name,
      startDate: start,
      endDate: end,
      venue: stripTags(i2.event_place),
      address: stripTags(acc.address || i2.address),
      time: stripTags(i2.event_time),
      fee: stripTags(i2.price),
      organizer: stripTags(i2.contact).replace(/\s*(TEL|電話)[:：].*$/i, "").trim(),
    };
  },
};
