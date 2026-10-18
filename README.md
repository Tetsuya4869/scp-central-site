# scp-central-site

16支部のSCP記事を検索し、読了・お気に入り・メモ・読むキューを管理する React/Vite アプリです。

Node.js 22以降で実行できます。

```sh
npm ci
npm run dev
```

変更を確認するには、テストと本番ビルドを実行してください。プレビューは `/scp-central-site/` で開きます。

```sh
npm test
npm run build
npm run preview
```

検索の所要時間は `node --expose-gc scripts/benchmark-search.mjs` で計測できます。初回のインデックス生成と、生成後の検索時間・メモリ使用量を表示します。

本番ビルドでは生成物の内容からサービスワーカーのリビジョンを自動計算し、記事データの更新もオフラインキャッシュに反映します。キャッシュ番号の手動更新は不要です。
