# アーキテクチャ

## 構成

- `app/`: Next.js App Routerの画面とAPI route
- `components/`: クライアントUI
- `lib/`: 金額計算、清算計算、自動支出判定、Prismaサービス層
- `prisma/`: DBスキーマ、マイグレーション、seed
- `scripts/recurring-worker.ts`: 自動支出生成worker
- `tests/`: 純粋ロジックのユニットテスト

## 実行プロセス

- `app`: Next.jsサーバー。画面表示と `/api/*` を担当する。
- `postgres`: 永続データベース。
- `worker`: 一定間隔で自動支出ルールを確認し、対象日の支出を生成する。

## データフロー

1. 画面は `/api/*` にJSONでアクセスする。
2. API routeは `lib/services.ts` の関数を呼ぶ。
3. サービス層はPrismaでDBを更新し、計算ロジックは `lib/money.ts`、`lib/settlement.ts`、`lib/recurring.ts` を使う。
4. 清算サマリーはDBの清算計上済み支出と受け渡し履歴から都度計算する。

## 将来のLINE連携

LINE Webhookは、直接DBを触らず、既存の支出作成サービスと清算サマリーサービスを呼ぶ。外部公開する場合は、署名検証、送信元制限、入力パース、監査ログを追加する。
