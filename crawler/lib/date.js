// 日本語の日付表現を ISO 日付 (YYYY-MM-DD) に変換する。
// 戻り値: { date, endDate|null } または null

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// 全角数字→半角、よくある区切りをそろえる
function normalize(s) {
  return String(s || "")
    .normalize("NFKC")
    .replace(/[〜～–—―]/g, "~")
    .replace(/\s+/g, " ")
    .trim();
}

// 年が省略されているとき、基準日から見て「過去すぎる」なら翌年とみなす
function inferYear(month, day, today) {
  const y = today.getFullYear();
  const cand = new Date(y, month - 1, day);
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - 2);
  return cand < cutoff ? y + 1 : y;
}

export function parseJpDate(input, today = new Date()) {
  const s = normalize(input);
  if (!s) return null;

  // 2026年5月16日 ~ 2026年6月2日 / 2026年5月16日(土) ~ 5月18日(月)
  let m = s.match(
    /(\d{4})年(\d{1,2})月(\d{1,2})日[^0-9]*?(?:~|から)\s*(?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日/
  );
  if (m) {
    const y1 = +m[1], mo1 = +m[2], d1 = +m[3];
    const y2 = m[4] ? +m[4] : y1;
    const mo2 = m[5] ? +m[5] : mo1;
    const d2 = +m[6];
    return { date: iso(y1, mo1, d1), endDate: iso(y2, mo2, d2) };
  }

  // 2026年5月16日(土) / 2026年5月16日
  m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return { date: iso(+m[1], +m[2], +m[3]), endDate: null };

  // 2026/5/16 ~ 2026/6/2  ・ 2026-05-16 ・ 2026.5.16
  m = s.match(
    /(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\s*(?:~\s*(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2}))?/
  );
  if (m) {
    const start = iso(+m[1], +m[2], +m[3]);
    const end = m[4] ? iso(+m[4], +m[5], +m[6]) : null;
    return { date: start, endDate: end };
  }

  // 5月16日(土) ~ 17日  ・ 5月16日  （年省略）
  m = s.match(/(\d{1,2})月(\d{1,2})日[^0-9]*?(?:~\s*(?:(\d{1,2})月)?(\d{1,2})日)?/);
  if (m) {
    const mo1 = +m[1], d1 = +m[2];
    const y1 = inferYear(mo1, d1, today);
    let endDate = null;
    if (m[4]) {
      const mo2 = m[3] ? +m[3] : mo1;
      let y2 = y1;
      if (mo2 < mo1) y2 = y1 + 1; // 年をまたぐ
      endDate = iso(y2, mo2, +m[4]);
    }
    return { date: iso(y1, mo1, d1), endDate };
  }

  return null;
}

// ISO 日付から表示用の文字列を作る（元の表記が取れなかったとき用）
export function toDateText(date, endDate) {
  if (!date) return "";
  const f = (v) => {
    const [y, m, d] = v.split("-").map(Number);
    return `${y}年${m}月${d}日`;
  };
  if (endDate && endDate !== date) return `${f(date)}〜${f(endDate)}`;
  return f(date);
}
