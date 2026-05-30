# dousei-kakeibo

同棲生活向けの家計簿アプリです。支出、立替、カテゴリ別の負担割合、精算、自動支出生成を扱います。

## 技術構成

- Next.js 15
- React 19
- TypeScript
- Prisma
- PostgreSQL 16
- Vitest
- Docker / Docker Compose

## 必要なもの

- Node.js
- npm
- Docker
- Docker Compose

このリポジトリでは、開発時はPostgreSQLだけDockerで起動し、Next.jsはローカルの `npm run dev` で動かす運用を推奨します。コード変更のたびにDockerイメージを作り直す必要がないため、普段の開発が軽くなります。

## 初回セットアップ

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

`.env` はローカル開発用です。Dockerで起動したPostgreSQLへホスト側から接続するため、`DATABASE_URL` は `localhost:5432` を向きます。

```env
DATABASE_URL="postgresql://kakeibo:kakeibo@localhost:5432/kakeibo?schema=public"
APP_BASE_URL="http://localhost:3000"
```

## 開発向け: DBはDocker、アプリはローカル

PostgreSQLだけDockerで起動します。

```bash
docker compose up -d postgres
```

DBのマイグレーションと初期データ投入を行います。

```bash
npm run prisma:migrate
npm run prisma:seed
```

Next.jsの開発サーバーを起動します。

```bash
npm run dev
```

アプリは次のURLで開けます。

```text
http://localhost:3000
```

開発を終了するときは、Next.jsのプロセスを停止します。DBコンテナも止めたい場合は次を実行します。

```bash
docker compose stop postgres
```

DBのデータも含めて削除したい場合は、volumeも削除します。

```bash
docker compose down -v
```

## 本番向け: すべてDocker

Next.jsアプリ、worker、PostgreSQLをすべてDocker Composeで起動します。

```bash
docker compose up --build
```

バックグラウンドで起動する場合:

```bash
docker compose up -d --build
```

この構成では、各サービスは次の役割を持ちます。

- `postgres`: PostgreSQL
- `app`: Next.jsアプリ
- `worker`: 自動支出生成ワーカー

`app` と `worker` はDockerネットワーク内のPostgreSQLへ接続するため、`DATABASE_URL` は `postgres:5432` を向きます。これは [docker-compose.yml](/mnt/c/Users/Yoji/workspace/dousei-kakeibo/docker-compose.yml) 内で設定されています。

起動時に `app` と `worker` は `prisma migrate deploy` を実行します。本番相当の起動では `migrate dev` ではなく、既存のマイグレーションを適用する `migrate deploy` を使います。

ログ確認:

```bash
docker compose logs -f app
docker compose logs -f worker
docker compose logs -f postgres
```

停止:

```bash
docker compose down
```

データも削除:

```bash
docker compose down -v
```

## よく使うコマンド

```bash
npm run dev              # 開発サーバー起動
npm run build            # production build
npm run start            # build済みアプリを起動
npm run lint             # TypeScriptチェック
npm run test             # テスト実行
npm run test:watch       # テストwatch
npm run prisma:generate  # Prisma Client生成
npm run prisma:migrate   # 開発用マイグレーション
npm run prisma:deploy    # 本番用マイグレーション適用
npm run prisma:seed      # 初期データ投入
npm run worker           # 自動支出生成worker起動
```

## DBとPrisma

Prisma schemaは [prisma/schema.prisma](/mnt/c/Users/Yoji/workspace/dousei-kakeibo/prisma/schema.prisma) にあります。

マイグレーションを作成・適用する場合:

```bash
npm run prisma:migrate
```

Prisma Clientを再生成する場合:

```bash
npm run prisma:generate
```

初期データを投入する場合:

```bash
npm run prisma:seed
```

seedでは基本カテゴリなどを作成します。メンバーが存在する状態でseedすると、カテゴリごとの均等割り勘率も設定されます。

## テスト

```bash
npm run test
```

watchモード:

```bash
npm run test:watch
```

## ディレクトリ構成

```text
app/          Next.js App RouterとAPI routes
components/   UIコンポーネント
lib/          ドメインロジック、サービス、Prisma Client
prisma/       Prisma schema、migrations、seed
scripts/      workerなどの実行スクリプト
tests/        Vitestのテスト
docs/         設計・開発ドキュメント
public/       静的ファイル
```

## 注意点

- 現状はログイン機能がないため、外部公開する前に認証とアクセス制御を追加してください。
- 外部公開やWebhook連携を行う場合は、署名検証、ログ、バックアップ方針も先に整備してください。
- `docker compose down -v` はPostgreSQLのvolumeを削除します。必要なデータがある場合は実行前にバックアップしてください。
- 自動支出生成の日付判定は実装上のタイムゾーンに注意してください。日本時間基準を厳密に扱う場合は、worker側の対象日計算を確認してください。
