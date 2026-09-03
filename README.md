# びんごイベントナビ

福山を中心とした備後エリア（福山・笠岡・尾道・府中・神辺）のイベント情報サイト。
素の HTML/CSS/JS の静的サイト＋ Node 製クローラで構成。GitHub Pages で公開し、
GitHub Actions が毎日クロールして `data/events.js` を更新 → 自動で再デプロイする。

```
/
├─ index.html / detail.html / 404.html      サイト本体（GitHub Pages のルート）
├─ submit.html                              イベント掲載・修正依頼フォーム
├─ admin/events.html                        手入力ツール（内部用・noindex）
├─ robots.txt / sitemap.xml / favicon.svg
├─ CNAME                                     ← 独自ドメイン確定後に追加
├─ assets/  css / js / img
├─ data/
│  ├─ events.js     イベントデータ（クローラが生成。seed 同梱）
│  └─ manual.json   人手の上書き・固定表示・除外・手動追加
├─ crawler/         毎日のクロール（配信物には含めない）
└─ .github/workflows/  deploy.yml（公開）/ crawl.yml（毎日クロール）
```

## イベントの入り口（3系統）

1. **自動クロール** — `crawler/sources/` に登録したサイト・RSS・iCal・API から毎日収集。
   取り込むのは事実だけ（名称・日時・会場・住所・時間・料金・主催・出典リンク）。
   現在の接続: Dive! Hiroshima（県公式観光）、びんごライフ イベントRSS（備後圏域6市2町）。
2. **投稿フォーム** `submit.html` — 主催者・住民が投稿 → メール（既定）で届く →
   確認して手入力ツールで追加。
3. **手入力ツール** `admin/events.html` — `data/manual.json` をブラウザで編集して
   ダウンロード → リポジトリに commit。クロールで拾えない催しや、紹介文・固定表示・
   非表示（削除依頼）をここで。

## ローカルでの確認

ビルド不要。`index.html` をダブルクリックしてブラウザで開く。

- 海の帯＋月バー＋新着イベント（電光掲示板）＋「開催が近い順」の3列コンパクト表
- カードクリックで `detail.html?id=<id>`。未知の id は「見つかりません」

クローラを試す:

```
cd crawler
npm ci
npm test              # ユニットテスト
node run.js --dry-run # 実行の流れだけ確認（ファイルは変更しない）
node run.js           # data/events.js と sitemap.xml を再生成
```

## 公開の手順（初回）

1. **ドメイン文字列を置換**：全ファイルの `https://bingo-event.example.jp` を本番ドメインに、
   `info@bingo-event.example.jp` を連絡先アドレスに一括置換。
   （`index.html` / `detail.html` / `404.html` / `robots.txt` / `sitemap.xml` / `crawler/config.js`）
2. **GitHub に公開リポジトリを作成して push**（例）:
   ```
   git init && git add -A && git commit -m "initial"
   git branch -M main
   gh repo create <name> --public --source . --remote origin --push
   ```
   ※ 無料アカウントでは Pages / Actions を無制限に使うため **public** を推奨。
     非公開necessary の場合は「Cloudflare Pages へ移行」（下記）を参照。
3. **GitHub Pages を有効化**：リポジトリ Settings → Pages → Build and deployment の
   Source を「**GitHub Actions**」に。以後 `main` への push で `deploy.yml` が走る。
   `https://<user>.github.io/<repo>/` で表示確認。
4. **独自ドメイン**（取得後）:
   - リポジトリ直下に `CNAME` ファイル（中身は `example.jp` の1行）を作成して commit。
   - DNS: apex は GitHub Pages の A/AAAA レコード（`185.199.108–111.153` /
     `2606:50c0:8000–8003::153`）、`www` は `<user>.github.io` の CNAME。
   - Settings → Pages で独自ドメインを入力し「**Enforce HTTPS**」を有効化。
5. **毎日クロールの確認**：Actions タブ → 「Daily crawl」→ Run workflow で手動実行。
   差分が出れば `github-actions[bot]` が `data/events.js` を commit → `deploy.yml` が連鎖。

## 日々の運用

| やりたいこと | 方法 |
| --- | --- |
| クロール対象サイトを追加 | `crawler/sources/index.js` に追記（→ `crawler/README.md`）。追加前に robots.txt と利用規約を確認 |
| 壊れたサイトを一時停止 | `crawler/sources/index.js` の該当行をコメントアウト |
| イベントを消す（削除依頼対応） | `data/manual.json` の `exclude` に id を追加して commit |
| 新着枠に固定 | `data/manual.json` の `pins` に id |
| 個別に文言・画像を直す | `data/manual.json` の `overrides` |
| クロールで拾えないイベントを足す | `data/manual.json` の `additional` に1件まるごと |
| クロール時刻の変更 | `.github/workflows/crawl.yml` の `cron`（UTC。`0 21 * * *` = JST 06:00） |

クロールが失敗した日は前回のデータを保持する（終了30日以内のイベントは残る）。
`run.js` は1ソースが失敗しても他を続行し、Actions のログに `::warning::` を出す。

## Cloudflare Pages へ移行する場合（任意）

非公開リポジトリにしたい / CDN を強化したいとき:

1. Cloudflare Pages で同じリポジトリを接続。ビルドコマンドなし、出力ディレクトリ `/`。
2. ただし `crawler/` を配信しない設定に（`_site` へ絞るなら簡単なビルドスクリプトを追加）。
3. DNS を Cloudflare に移し、Pages のカスタムドメインを設定。
4. 毎日クロールは GitHub Actions のまま（private でも無料枠内に収まる）。

## データのスキーマ

`data/events.js` は `window.EVENTS = [ ... ]`（有効な JSON 配列）。1件:

| キー | 必須 | 内容 |
| --- | --- | --- |
| `id` | ✓ | 一意キー（`YYYYMMDD-<hash>`。seed は旧形式のまま） |
| `name` `area` `date` `dateText` | ✓ | 名称 / エリア / 開始日(ISO) / 表示用日付 |
| `endDate` | | 終了日(ISO)。単日は無し |
| `image` | ✓ | 画像URL。空ならカラープレースホルダ |
| `summary` `description` | | 短い要約（本文の全文転載はしない） |
| `venue` `address` `time` `fee` `organizer` | | 詳細ページの情報テーブル |
| `sourceUrl` | ✓ | 出典（詳細ページに常時表示） |
| `crawledAt` | ✓ | 取得日。新着判定・最終確認日表示に使用 |
| `featured` | | true で新着枠に固定 |
