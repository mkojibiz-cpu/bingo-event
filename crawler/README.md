# crawler — 毎日のイベント収集

各サイトからイベント情報を集めて、リポジトリ直下の `data/events.js` と
`sitemap.xml` を再生成する。GitHub Actions の `crawl.yml` が毎日実行する。

## 収集方針（厳守）

- 取得先ごとに **robots.txt と利用規約を確認**してから追加する。
  RSS / iCal / API / オープンデータがあればそちらを使う。
- 保存するのは **「名称・日時・会場・エリア・出典URL＋短い要約」まで**。
  本文の全文コピー・画像の保存やホットリンクはしない。
- 取得は1日1回・低速（`config.js` の `REQUEST_DELAY_MS`）・条件付きリクエスト
  （ETag / Last-Modified をキャッシュ）。連絡先入り User-Agent を送出。
- 削除依頼が来たら `data/manual.json` の `exclude` に id を追加する。

## 構成

```
run.js            全ソース実行 → 正規化 → 重複排除 → 既存とマージ → manual.json 適用 → 書き出し
config.js         ドメイン / User-Agent / エリア判定キーワード / 保持日数
lib/
  fetch.js        丁寧な取得（遅延・リトライ・キャッシュ）
  robots.js       robots.txt 判定
  extract.js      JSON-LD(schema.org/Event) 抽出
  date.js         和暦・日本語日付 → ISO
  normalize.js    統一スキーマ化・エリア判定・要約の圧縮
  dedupe.js       同一IDのマージ
  store.js        events.js / manual.json / sitemap.xml の読み書き
sources/
  index.js        有効なソースの一覧（ここを編集して対象を増減）
  jsonld.js       JSON-LD を出すサイト向けの汎用ソース
  _template.js    CSS セレクタで抽出するサイト用のテンプレート
test/             node --test。サイト改装の検知にも使う
```

## ソースを追加する

### A. サイトが JSON-LD(Event 構造化データ) を出している場合

`sources/index.js` に追記するだけ:

```js
jsonLdSource({
  name: "◯◯観光協会 イベント",
  listUrls: ["https://example.jp/events/"],   // 一覧ページ（複数可）
  detailLinkPattern: /\/events\/[0-9]+/,       // 詳細ページURLのパターン
  areaHint: "笠岡",                            // 市単位サイトなら指定。null なら会場から自動判定
})
```

確認方法: 対象の詳細ページを開き、ソースに
`<script type="application/ld+json"> ... "@type": "Event" ...` があれば A でいける。

### B. 構造化データが無い場合

`_template.js` を `sources/<site>.js` にコピーし、`collectDetailLinks` と
`parseDetail` を実サイトの CSS セレクタに合わせて実装。`sources/index.js` で
`import` して配列に加える。

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
