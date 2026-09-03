// クローラ全体の設定。本番ドメインが決まったら SITE_ORIGIN と連絡先を書き換える。

export const SITE_ORIGIN = "https://bingo-event.com";
export const CONTACT_EMAIL = "info@bingo-event.com";

// 取得先に送る User-Agent（連絡先を必ず含める）
export const USER_AGENT =
  `BingoEventNaviBot/1.0 (+${SITE_ORIGIN}; ${CONTACT_EMAIL})`;

// リクエスト間隔（ミリ秒）。負荷をかけないよう十分に空ける。
export const REQUEST_DELAY_MS = 1500;

// 終了からこの日数を過ぎたイベントは data/events.js から削除する。
export const KEEP_DAYS_AFTER_END = 30;

// エリアのラベルと判定キーワード。
// 上から順に判定するので、福山市内でも独立ラベルにしたい「神辺」を先に置く。
// キーワードは「他地域の地名や観光コピーに紛れにくい」ものだけにする
//   （例:「内海」は "瀬戸内海" に、「府中」は 府中町(安芸) に誤マッチするので避ける／限定する）。
export const AREAS = [
  { label: "神辺", keywords: ["神辺", "神辺町"] },
  { label: "福山", keywords: ["福山", "鞆の浦", "鞆町", "松永", "駅家", "新市町", "沼隈", "内海町", "芦田川", "水呑"] },
  { label: "笠岡", keywords: ["笠岡", "北木島", "白石島", "真鍋島", "カブトガニ博物館", "笠岡ベイファーム"] },
  { label: "尾道", keywords: ["尾道", "因島", "瀬戸田", "向島", "御調", "千光寺", "しまなみ海道 尾道"] },
  { label: "府中", keywords: ["府中市", "上下町", "羽高湖", "備後国府", "府中焼き"] },
];
