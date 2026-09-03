# crawler — 毎日のイベント収集

各サイトからイベント情報を集めて、リポジトリ直下の `data/events.js` と
`sitemap.xml` を再生成する。GitHub Actions の `crawl.yml` が毎日実行する。

## 収集方針（厳守）

- 取得先ごとに **robots.txt と利用規約を確認**してから追加する。
  RSS / iCal / API / オープンデータがあればそちらを使う。
- **クロールで取り込むのは「事実情報」だけ**：
  名称・日時・会場・住所・時間・料金・主催・エリア・出典リンク。
  **紹介文・キャッチコピー・写真は取り込まない**（著作権に配慮）。
  紹介文が要るときは `data/manual.json` に **自分の言葉で** 書く。
- 取得は1日1回・低速（`config.js` の `REQUEST_DELAY_MS`。robots.txt の
  `Crawl-delay` があればそれを優先）・条件付きリクエスト
  （ETag / Last-Modified をキャッシュ）。連絡先入り User-Agent を送出。
- 各ページに出典リンクを必ず表示し、詳細は公式ページへ誘導する。
- 削除依頼が来たら `data/manual.json` の `exclude` に id を追加する。

## 構成

```
run.js            全ソース実行 → 正規化 → 重複排除 → 既存とマージ → manual.json 適用 → 書き出し
config.js         ドメイン / User-Agent / エリア判定キーワード / 保持日数
lib/
  fetch.js        丁寧な取得（遅延・リトライ・キャッシュ・Crawl-delay・任意ヘッダ）
  robots.js       robots.txt 判定 / Crawl-delay
  extract.js      JSON-LD(schema.org/Event) 抽出
  feed.js         RSS/Atom・iCal の最小パーサ
  date.js         和暦・日本語日付 → ISO
  normalize.js    統一スキーマ化・エリア判定（事実のみ）
  dedupe.js       同一IDのマージ
  store.js        events.js / manual.json / sitemap.xml の読み書き
sources/
  index.js         有効なソースの一覧（ここを編集して対象を増減）
  dive-hiroshima.js 実接続例（Next.js の __NEXT_DATA__ を読む）
  rss.js / ical.js  RSS / iCal の汎用ソース
  connpass.js       connpass（要 CONNPASS_API_KEY）
  jsonld.js         JSON-LD を出すサイト向けの汎用ソース
  _template.js      CSS セレクタで抽出するサイト用のテンプレート
test/             node --test。サイト改装の検知にも使う
```

## ソースを追加する

ソースの型は2つ:

- **クロール型** `{ listUrls, collectDetailLinks($, url, html), parseDetail($, url, html) }`
  一覧ページ → 詳細ページ の順にたどる。JSON-LD があれば `jsonLdSource` が手軽。
  無ければ `_template.js` をコピーして CSS セレクタ／埋め込みJSONで抽出
  （実接続例は `dive-hiroshima.js`）。
- **フィード型** `{ async fetchRaws(ctx) }` … 1回で raw 配列を返す。RSS/iCal/API 向け。
  `ctx = { fetchText, warn, today }`。`rss.js` / `ical.js` / `connpass.js` が実装。

```js
// RSS（多くの WordPress サイトは /feed/ を持つ。カテゴリ別は /category/xxx/feed/）
rssSource({ name: "◯◯協会 お知らせ（RSS）", feedUrls: ["https://example.jp/feed/"], areaHint: "尾道" })

// 公開Googleカレンダー等の iCal（DTSTART が構造化されていて確実）
icalSource({ name: "◯◯実行委 カレンダー", icsUrls: ["https://.../basic.ics"], areaHint: "福山" })
```

RSS の item には開催日欄が無いことが多いので、日付はタイトル＋説明文から
`parseJpDate` で拾う（拾えなければ不採用）。説明文そのものは保存しない。

`robots.txt` の `Crawl-delay` は自動で尊重する。加えて手動で下限を設けたいときは
ソースに `minDelayMs: 90000` を付ける。

## 動かす

```
npm ci
npm test                # ユニットテスト
node run.js --dry-run   # 書き込みせず流れを確認
node run.js             # data/events.js と sitemap.xml を更新
```

`--dry-run` 後に `git diff` で差分を確認してからコミットするのが安全。

## 一時停止・トラブル対応

- 特定サイトがエラーを出し続ける → `sources/index.js` の該当行をコメントアウト。
- 全ソース失敗時は `run.js` が終了コード1（Actions が失敗通知）。
  それ以外は部分成功でも0で終了し、取れた分だけ書き出す。
- 既存イベントは、クロールに失敗しても「終了30日以内」なら保持される
  （`config.js` の `KEEP_DAYS_AFTER_END`）。
