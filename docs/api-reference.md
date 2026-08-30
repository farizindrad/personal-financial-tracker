# Ledger — API Reference

REST API. Base URL is `{host}/api`. All request/response bodies are JSON.

## Global behavior

- Global prefix: `/api` (set in `backend/src/main.ts`).
- Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` — unknown request fields are rejected with a `400`.
- Errors: thrown by `AllExceptionsFilter`. Shape is `{ "message": string | string[], "error"?: string, "statusCode": number }`. Validation errors return `message` as an array of rule messages.
- All list endpoints are paginated: `page` (min 1) and `limit` (min 1, max 100). Response shape:
  ```json
  { "data": [], "meta": { "total": 0, "page": 1, "limit": 20 } }
  ```
- Money fields use `DECIMAL(15,2)` and may serialize as strings.
- **Auth required**: all endpoints except `/health`, `/auth/config`, `/auth/register`, `/auth/login`, `/auth/logout` require a valid session cookie `ledger_token`. Unauthenticated → `401`. All data is scoped to the authenticated user.
- Write endpoints are rate-limited (tighter in demo mode); auth endpoints get `10 req/min` per IP.

Enums used in payloads: `AccountType = bank|cash|e_wallet|other`, `CategoryType = income|expense`, `TransactionType = income|expense|transfer`, `RecurringFrequency = daily|weekly|monthly|yearly`, `AssetType = property|vehicle|investment|gold|cash|other`, `LiabilityType = credit_card|loan|other`.

## Auth

### GET /auth/config

Public. Returns feature flags so the UI can adapt (e.g., hide registration in demo mode).

```json
{ "demo": true, "demoEmail": "demo@ledger.app" }
```

### POST /auth/register

Public. Body: `email`, `password` (min 6). Creates a user, sets the session cookie. Disabled (`403`) when `IS_DEMO=true`.

### POST /auth/login

Public. Body: `email`, `password`. Sets the `ledger_token` HttpOnly cookie.

### POST /auth/logout

Clears the session cookie.

### GET /auth/me

Returns the current user, or `401` when not authenticated.

## Accounts

### GET /accounts

Query: `page`, `limit`. Returns accounts with live `currentBalance` (computed, not stored).

```json
{
  "data": [
    { "id": 1, "name": "BCA", "type": "bank", "initialBalance": "0.00",
      "isActive": true, "notes": null, "currentBalance": "1250000.00" }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
```

### POST /accounts

Body:

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 100 |
| `type` | AccountType | optional, default `other` |
| `initialBalance` | number | optional, max 2 decimals |
| `notes` | string | optional, max 255 |

### PATCH /accounts/:id

Same fields as POST, all optional. Partial update.

### DELETE /accounts/:id

Soft-delete: sets `isActive = false`. Transaction history is preserved. Returns `204`.

## Categories

### GET /categories

Query: `page`, `limit`, `type` (`income|expense`). Root categories include `children` (sub-categories) via eager-load.

```json
{
  "data": [
    { "id": 1, "name": "Makanan", "type": "expense", "parentId": null,
      "icon": null, "color": "#1D9E75", "isActive": true,
      "children": [ { "id": 2, "name": "Makan siang", "type": "expense",
        "parentId": 1, "icon": null, "color": null, "isActive": true } ] }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
```

### POST /categories

Body:

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 100, unique with `type` |
| `type` | CategoryType | required |
| `parentId` | number | optional, parent category id |
| `icon` | string | optional, max 50 |
| `color` | string | optional, hex `#RRGGBB` |

### PATCH /categories/:id

All optional: `name`, `parentId` (number|null), `icon`, `color`, `isActive` (boolean). Soft-delete via `isActive: false` — historical reports stay valid.

## Transactions

### GET /transactions

Query: `page`, `limit` (default 20), `dateFrom`, `dateTo` (ISO dates), `accountId`, `categoryId`.

```json
{
  "data": [
    { "id": 1, "accountId": 1, "categoryId": 2, "type": "expense",
      "amount": "45000.00", "transactionDate": "2026-08-05",
      "description": "Makan siang", "transferToAccountId": null,
      "account": { "id": 1, "name": "BCA", "type": "bank" },
      "category": { "id": 2, "name": "Makan siang", "type": "expense",
        "color": "#1D9E75", "parentId": 1 },
      "transferToAccount": null }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### POST /transactions

Body:

| Field | Type | Rules |
|---|---|---|
| `accountId` | number | required |
| `type` | TransactionType | required |
| `amount` | number | required, min 0.01, max 2 decimals |
| `transactionDate` | string (ISO date) | required |
| `categoryId` | number | required for `income`/`expense` |
| `transferToAccountId` | number | required for `transfer` (must differ from `accountId`) |
| `description` | string | optional, max 255 |

### PATCH /transactions/:id

Same fields as POST, all optional. `categoryId`/`transferToAccountId` accept `null`.

### DELETE /transactions/:id

Hard delete. Returns `204`. Account balances recompute automatically.

## Dashboard

### GET /dashboard/summary

Query: `month` (1–12), `year` (2000–2100), both optional (defaults to current month/year).

```json
{
  "totalBalance": "1250000.00",
  "incomeThisMonth": "5000000.00",
  "expenseThisMonth": "3750000.00",
  "netThisMonth": "1250000.00",
  "assetTotal": "25000000.00",
  "liabilityTotal": "5000000.00",
  "netWorth": "21250000.00",
  "period": { "month": 8, "year": 2026 },
  "recentTransactions": [
    { "id": 1, "type": "expense", "amount": "45000.00",
      "transactionDate": "2026-08-05", "description": "Makan siang",
      "account": { "id": 1, "name": "BCA", "type": "bank" },
      "category": { "id": 2, "name": "Makan siang", "type": "expense", "color": "#1D9E75" },
      "transferToAccount": null }
  ]
}
```

`netWorth = totalBalance + assetTotal − liabilityTotal`. This is a single aggregated request (backend combines queries in parallel).

### GET /dashboard/daily

Query: `month` (1–12), `year` (2000–2100), both optional (defaults to current month/year). Returns income/expense/net aggregated per day for the calendar view.

```json
{
  "month": 8,
  "year": 2026,
  "data": [
    { "date": "2026-08-05", "income": "0.00", "expense": "45000.00", "net": "-45000.00" },
    { "date": "2026-08-01", "income": "5000000.00", "expense": "0.00", "net": "5000000.00" }
  ]
}
```

## Assets

### GET /assets

Query: `page`, `limit`.

```json
{
  "data": [
    { "id": 1, "name": "Rumah", "type": "property",
      "value": "250000000.00", "notes": null, "createdAt": "2026-08-01T00:00:00.000Z" }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
```

### POST /assets

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 100 |
| `type` | AssetType | optional, default `other` |
| `value` | number | required, min 0, max 2 decimals |
| `notes` | string | optional, max 255 |

### PATCH /assets/:id

Same fields as POST, all optional.

### DELETE /assets/:id

Hard delete. Returns `204`.

## Liabilities

### GET /liabilities

Query: `page`, `limit`.

```json
{
  "data": [
    { "id": 1, "name": "Kartu kredit", "type": "credit_card",
      "amount": "5000000.00", "notes": null, "createdAt": "2026-08-01T00:00:00.000Z" }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
```

### POST /liabilities

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 100 |
| `type` | LiabilityType | optional, default `other` |
| `amount` | number | required, min 0, max 2 decimals |
| `notes` | string | optional, max 255 |

### PATCH /liabilities/:id

Same fields as POST, all optional.

### DELETE /liabilities/:id

Hard delete. Returns `204`.

## Budgets

### GET /budgets

Query (required): `month` (1–12), `year` (2000–2100). Also `page`, `limit`. Each row includes realization data.

```json
{
  "data": [
    { "id": 1, "categoryId": 1, "month": 8, "year": 2026,
      "budgetAmount": "1000000.00", "createdAt": "2026-08-01T00:00:00.000Z",
      "category": { "id": 1, "name": "Makanan", "type": "expense",
        "parentId": null, "icon": null, "color": "#1D9E75", "isActive": true },
      "spent": "450000.00", "remaining": "550000.00", "percentUsed": 45 }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50, "month": 8, "year": 2026 }
}
```

### POST /budgets

Upsert — one budget per `(categoryId, month, year)`.

| Field | Type | Rules |
|---|---|---|
| `categoryId` | number | required |
| `month` | number | required, 1–12 |
| `year` | number | required, 2000–2100 |
| `budgetAmount` | number | required, min 0, max 2 decimals |

## Savings Goals

### GET /savings-goals

Query: `page`, `limit`. Each row includes computed `currentAmount`, `remaining`, `percentComplete`, `isCompleted`, and linked `account`.

### POST /savings-goals

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 100 |
| `targetAmount` | number | required, min 0.01 |
| `targetDate` | string (ISO date) | optional |
| `accountId` | number | optional, links progress to an account |
| `notes` | string | optional, max 255 |

### PATCH /savings-goals/:id

Same fields as POST, all optional. `targetDate`/`accountId` accept `null`.

## Recurring Transactions

Templates materialized into real transactions by the daily scheduler (`@nestjs/schedule`, 01:00 local) when `next_run_date` is due.

### GET /recurring-transactions

Query: `page`, `limit`, `isActive` (`true|false`).

### POST /recurring-transactions

| Field | Type | Rules |
|---|---|---|
| `accountId` | number | required |
| `categoryId` | number | required |
| `type` | CategoryType | required (`income`/`expense`) |
| `amount` | number | required, min 0.01 |
| `frequency` | RecurringFrequency | required |
| `startDate` | string (ISO date) | required |
| `endDate` | string (ISO date) | optional |
| `nextRunDate` | string (ISO date) | optional |
| `description` | string | optional, max 255 |

### PATCH /recurring-transactions/:id

All optional: `accountId`, `categoryId` (nullable), `type`, `amount`, `frequency`, `startDate`, `endDate` (nullable), `nextRunDate`, `description`, `isActive`.

## Error responses

| Status | Meaning |
|---|---|
| 400 | Validation / bad request (message array for field errors) |
| 401 | Unauthenticated — missing/expired session cookie |
| 403 | Forbidden (e.g., register disabled in demo mode) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate category name+type) |
| 429 | Too many requests (rate-limited write) |
| 500 | Internal error |

Example validation error:

```json
{
  "message": ["name must be longer than or equal to 1 characters"],
  "error": "Bad Request",
  "statusCode": 400
}
```
