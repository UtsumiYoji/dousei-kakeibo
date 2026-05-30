# 開発・運用手順

## セットアップ

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

ローカルPostgresをDockerで起動する場合:

```bash
docker compose up postgres
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

アプリは `http://localhost:3000` で開く。

## Docker運用

```bash
docker compose up --build
```

`app` がNext.js、`worker` が自動支出生成、`postgres` がDBを担当する。接続情報は `DATABASE_URL` で外部化する。

PrismaがOpenSSL検出の警告を出す場合は、Dockerイメージを作り直す。

```bash
docker compose build --no-cache app worker
docker compose up
```

## よく使うコマンド

```bash
npm run dev
npm run build
npm run test
npm run prisma:migrate
npm run prisma:seed
npm run worker
```

## 初期データ

`npm run prisma:seed` で以下のカテゴリを作成する。

- 家賃
- 光熱費
- 通信費
- 食費
- その他

メンバーが存在する状態でseedすると、各カテゴリに均等割り勘率を設定する。

## 注意点

- 初期版はログインなしなので、外部公開しない。
- 外部公開やLINE Webhookを追加する場合は、認証、署名検証、ログ、バックアップ方針を先に追加する。
- 自動支出はUTCの日付で重複判定する。日本時間基準に厳密化する場合は、workerで対象日計算をAsia/Tokyoに寄せる。
