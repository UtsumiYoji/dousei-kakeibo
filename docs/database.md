# データベース設計

## 基本ルール

- 金額はすべて整数の円 `amountYen` として保存する。
- 割り勘率は basis point で保存し、`10000 = 100%` とする。
- 支出ごとの割り勘率はカテゴリのデフォルトからコピーして保存する。後からカテゴリを変更しても既存支出の比率は変えない。
- 「清算計上する」は `Expense.settledAt` に日時を入れ、清算管理の集計対象に移す操作。

## 主なモデル

- `Member`
  - 名前、表示順、有効状態を持つ。
- `Category`
  - カテゴリ名、表示順、`CategoryRatio` を持つ。
  - 表示順の先頭カテゴリは支出登録フォームの初期カテゴリとして使う。
- `Expense`
  - 支出内容、金額、支払者、カテゴリ、清算計上日時を持つ。
  - `ExpenseSplit` に支出時点の割り勘率を保存する。
- `Transfer`
  - お金受け渡し履歴。清算集計で過不足を減らす。
- `RecurringExpenseRule`
  - 毎日/毎週/毎月の自動支出ルール。
  - `RecurringExpenseGeneration` でルールと対象日の組み合わせを一意にし、重複生成を防ぐ。

## 清算計算

メンバーごとに以下を計算する。

- `paidYen`: その人が清算計上済み支出で支払った金額
- `owedYen`: 割り勘率に基づく負担額
- `transferOutYen`: その人が他の人へ渡した金額
- `transferInYen`: その人が他の人から受け取った金額
- `balanceYen = paidYen - owedYen - transferInYen + transferOutYen`

`balanceYen` が正なら受け取り側、負なら支払い不足側として推奨受け渡しを作る。
