/**
 * connpass（勉強会・交流会・マルシェ等の小さめの催し）。
 *
 * connpass API v2 は APIキー必須（2025〜）。キーを取得して
 * 環境変数 CONNPASS_API_KEY に入れると有効になる。未設定なら何もしない。
 *   - APIキー: connpass にログイン →「APIキー」ページで発行
 *   - GitHub Actions では Settings → Secrets に CONNPASS_API_KEY を登録し
 *     crawl.yml の env に渡す
 *
 * 取り込むのは title / started_at・ended_at / place・address / url のみ。
 * catch・description は使わない。
 */

const API = "https://connpass.com/api/v2/events/";
const KEYWORDS = ["福山", "尾道", "笠岡", "府中市", "神辺", "鞆の浦"];

export default {
  name: "connpass",
  areaHint: null,

  async fetchRaws(ctx) {
    const key = process.env.CONNPASS_API_KEY;
    if (!key) {
      ctx.warn("connpass: CONNPASS_API_KEY 未設定のためスキップ");
      return [];
    }

    const seen = new Set();
    const raws = [];
    for (const kw of KEYWORDS) {
      const url = `${API}?keyword=${encodeURIComponent(kw)}&count=50&order=2`;
      let json;
      try {
        const text = await ctx.fetchText(url, { headers: { "X-API-Key": key } });
        json = JSON.parse(text);
      } catch (e) {
        ctx.warn(`connpass: 取得失敗 (${kw}) — ${e.message}`);
        continue;
      }
      for (const ev of json.events || []) {
        if (!ev || seen.has(ev.id)) continue;
        seen.add(ev.id);
        raws.push({
          sourceUrl: ev.url || "",
          name: ev.title || "",
          startDate: (ev.started_at || "").slice(0, 10),
          endDate: (ev.ended_at || "").slice(0, 10),
          venue: ev.place || "",
          address: ev.address || "",
        });
      }
    }
    return raws;
  },
};
