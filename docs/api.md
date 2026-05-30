# API

すべて同一オリジンのJSON API。初期版では認証なし。

## エンドポイント

- `GET /api/members`
- `POST /api/members`
- `PATCH /api/members/:id`
- `DELETE /api/members/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `POST /api/categories/reorder`
- `GET /api/expenses?settled=unsettled|settled|all`
- `POST /api/expenses`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `POST /api/expenses/settle`
- `GET /api/settlements`
- `GET /api/transfers`
- `POST /api/transfers`
- `GET /api/recurring`
- `POST /api/recurring`
- `PATCH /api/recurring/:id`
- `POST /api/recurring/run`

## 代表的なペイロード

支出作成:

```json
{
  "description": "光回線",
  "amountYen": 5000,
  "payerMemberId": "member_id",
  "categoryId": "category_id",
  "ratios": [
    { "memberId": "member_a", "basisPoints": 5000 },
    { "memberId": "member_b", "basisPoints": 5000 }
  ]
}
```

清算計上:

```json
{
  "ids": ["expense_id"]
}
```

お金受け渡し:

```json
{
  "fromMemberId": "member_b",
  "toMemberId": "member_a",
  "amountYen": 4000
}
```

## Webhook拡張方針

LINE Botなどから支出を追加する場合も、DBに直接書かず `createExpense` と `getSettlementSummary` 相当のサービスを再利用する。Webhook専用の入力パース、署名検証、失敗時の返信整形をAPI層に追加する。
