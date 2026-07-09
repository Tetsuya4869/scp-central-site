# サイト情報 再取得プラン（Cowork 用指示書）

> **✅ 自動化済み（2026-07）**: 本プランの内容は `.github/workflows/update-data.yml` として実装済み。
> 週1回（月曜 3:00 JST）に GitHub Actions が自動実行し、差分があれば main へコミット → Pages を再デプロイする。
> - タイトル: `scripts/fetch-titles.mjs`（全支部・BRANCHES 駆動）
> - 評価・文字数: `scripts/fetch-details.mjs`（タイトルが付いた＝公開済みの記事のみ増分取得、`--max` で回数制限）
> - 手動実行: GitHub の Actions タブ → "Update article data" → Run workflow（バックログ消化時は max_detail_pages を 2000 程度に）
> - 404 は `scripts/detail-misses.json` に記録して以後スキップ
>
> 以下は当初の計画書（経緯の記録として保持）。

> このドキュメントは Cowork セッションに渡す実行計画書です。
> SCP 各支部のタイトル情報を `src/data/titles.json` に再取得・補完するための手順をまとめています。

---

## 目的

全 17 支部のタイトルを `src/data/titles.json` に取り込み、**欠番・新規記事を補完**する。
今後も定期的に再実行できるよう、`scripts/fetch-titles.mjs` を **`BRANCHES` 駆動の汎用版**に作り替える。

### なぜ必要か

1. **未取得のタイトルが大量に残っている**
   - 現状 `titles.json` は **`EN` と `JP` の 2 キーしか持たない**。
   - 残り 14 支部（CN / KO / RU / ZH / FR / PL / ES / TH / VN / DE / IT / PT / UA / CS）の
     タイトルは **1 件も無い** → これらの支部の記事はアプリ上で常にタイトル無し（指定番号のみ）で表示される。
   - EN / JP 内にも欠番が存在（EN 約 4,500・JP 約 1,500）。

2. **前回取得から日数が経過**
   - `titles.json` の最終更新は **2026-05-29**（約 1 ヶ月前）。
   - その後に新規公開された記事が未反映。

---

## 現状の技術的事実（調査済み）

### 取得スクリプト `scripts/fetch-titles.mjs`
- `npm run fetch-titles` で実行（`package.json` に登録済み）。
- `scp-jp.wikidot.com` のシリーズ一覧ページ HTML を正規表現でパースしてタイトルを抽出。
- **EN と JP のハブのみハードコード**（`JP_HUBS` / `EN_HUBS`）。出力は `{ EN, JP }` のみ。
- リクエスト間 **2 秒スリープ**、既存データと**マージ**（手動追記を保持）、数値キーで昇順ソート。
- `extractNumber()` は `scp-(\d+)(?:-jp)?...` 形式のみ対応
  → **prefix 系（`scp-cn-NNN` 等）は番号抽出に失敗する**。

### 支部定義 `src/data/branches.js`
- `BRANCHES` 配列に全支部が定義され、各 `series` が `hub`（scp-jp 上のパス）を持つ。
- URL パターンは 5 種（`src/utils/urlGenerator.js` の `getSlug` 参照）:

  | urlPattern | スラッグ形式 | 例 |
  |---|---|---|
  | `en` | `scp-NNN` | `scp-173` |
  | `suffix` | `scp-NNN-{code}` | `scp-173-jp`, `scp-173-ko` |
  | `prefix-cn` | `scp-cn-NNN` | `scp-cn-173` |
  | `prefix-pl` | `scp-pl-NNN` | `scp-pl-173` |
  | `prefix-zh` | `scp-zh-NNN` | `scp-zh-173` |

- 一部支部は複数 series で**同一 hub を共有**する。重複フェッチを避けること:
  - RU `/scp-list-ru`、FR `/liste-fr`、PL `/lista-pl`、TH `/scp-series-th`、
    DE `/scp-serie-de`、VN（series ごとに別 hub）など。

### タイトル参照 `src/utils/lookupArticle.js`
- `TITLES[branch.code]?.[String(number)]` でルックアップ（番号はゼロ埋めしない文字列キー）。
- タイトルが空なら `<span class="scp-title">` 自体を描画しない（フォールバック無し）。
- → 支部キーを増やすだけでアプリ側の改修は不要。

### 再利用すべき既存ロジック
- `src/utils/urlGenerator.js` の `getSlug(branchCode, number)` / `padNum()` のスラッグ規則を
  fetch スクリプト側の番号抽出にも反映する（パターンの単一情報源にする）。

---

## Cowork が行うステップ

### 1. 前提確認
- ネットワークポリシーが `scp-jp.wikidot.com` への**外向きアクセスを許可**しているか確認。
  （許可されていない場合、環境のネットワーク設定の見直しが必要）
- `npm ci` 済みであること。

### 2. `scripts/fetch-titles.mjs` の汎用化
- `import { BRANCHES } from '../src/data/branches.js'` で全支部を取得。
- 各支部の `series[].hub` を集約し、**重複 hub を除去**してから順に取得。
- 支部の `urlPattern` に応じた**番号抽出ロジック**を実装:
  - `en` / `suffix`: `scp-(\d+)` を抽出（既存の suffix 系正規表現を流用可）。
  - `prefix-cn`: `scp-cn-(\d+)` / `prefix-pl`: `scp-pl-(\d+)` / `prefix-zh`: `scp-zh-(\d+)`。
  - **支部ごとに専用パターンで抽出**すること（prefix 系を汎用パターンで処理すると EN 番号と衝突する）。
- 抽出結果を `result[branch.code][number] = title` に格納。
- 既存 `titles.json` を読み込み**マージ**（既存値を消さない方針。新規追加 or 上書きの基準を明示）。
- 全支部キーを数値昇順ソートして書き出し。
- **2 秒スリープ・User-Agent ヘッダは維持**。

### 3. 実行
```bash
npm run fetch-titles
```

### 4. 差分レポート出力（スクリプト末尾 or 実行後）
- 支部別の取得件数。
- 前回からの新規件数。
- 取得 0 件のまま残った支部（hub が翻訳一覧を持たない／構造が異なる支部）。

### 5. 検証
- `npm run build` がエラー無く通る。
- アプリを起動し、**CN / KO など新規支部でタイトルが表示される**ことをスポット確認。
- **EN / JP の既存タイトルが消えていない**こと（マージ確認）。
- `git diff --stat` で `titles.json` の差分が妥当（巨大な意図しない削除が無い）か確認。

### 6. コミット & push
- 開発ブランチ運用に従ってコミット・push。

---

## 注意点・既知のリスク

- **翻訳一覧が無い支部**: JP wiki のハブが支部によっては翻訳一覧を持たない／構造が異なる可能性。
  取得 0 件の支部はログに残す。native wiki へのフォールバックは**今回はしない**
  （アプリは日本語訳タイトル前提のため、native wiki は native 言語タイトルになり不適切）。
- **HTML 構造変更**: 正規表現が当たらない場合あり。取得 0 件が続く支部は HTML を実地確認する。
- **prefix 系の番号衝突**: 抽出を誤ると EN 番号と衝突する恐れ。支部ごとに専用パターンで抽出する。
- **負荷配慮**: hub 数が増える（40+）ため、逐次・2 秒間隔を厳守する。

---

## スコープ外（任意の後続作業）

- `char_counts.json` / `ratings.json` の更新。
  - 専用の生成スクリプトが存在しないため、別途サイトマップ / Wikidot API からの取得方式を
    設計する必要がある。今回のタイトル取得とは切り離して扱う。
