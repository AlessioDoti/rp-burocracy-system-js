# rp-burocracy-system

A small backend service that models the bureaucratic administration of an
RPG government: businesses (activities) belong to categories, each with
its own tax brackets; the service tracks the periodic tax declarations
filed by the manager of every business and computes the amount owed from
the declared expenses and earnings.

Built as a hexagonal (ports & adapters) Node.js + Express application
in pure JavaScript. MySQL is the only data store.

## Features

- **Hexagonal architecture**: clear separation between the domain, the
  persistence adapter (MySQL), the external port mock (Person service),
  and the HTTP adapter (Express).
- **Transactional, auditable tax computation**: revenue, bracket-based
  tax rate, elapsed days, and taxable income are derived inside the
  service from the declared figures — never trusted from the client.
- **Strict input validation** at the domain boundary (Zod schemas
  co-located with the DTOs), mapped to HTTP 400 by the global error
  handler.
- **Typed error hierarchy** (`AppError` → `ValidationError`,
  `NotFoundError`, `ConflictError`) surfaced as a uniform JSON envelope
  with the right status code.
- **No ORM**: the persistence layer issues explicit SQL via
  `mysql2/promise` for transparency and easy auditing.
- **Test-first**: 68 unit + integration tests covering mappers, domain
  services, request handlers, REST factories, and the full HTTP surface
  — all without a running MySQL instance.

## Project layout

```
burocracy-system-js/
├── db/
│   ├── init/
│   │   ├── 01_init.sql                # schema (CATEGORY, CATEGORY_TAXES, ACTIVITY, TAX)
│   │   └── 02_populate.sql            # mock data for development
│   └── mysql-burocracy.yml             # docker-compose for MySQL 8
├── src/
│   ├── server.js                       # bootstrap: listen + signal handling
│   ├── app.js                          # Express app factory
│   ├── config/
│   │   ├── env.js                      # Zod-validated environment
│   │   ├── logger.js                   # Pino logger (pretty in dev/test, JSON in prod)
│   │   └── container.js                # composition root (DI wiring)
│   ├── domain/                         # pure business — no framework imports
│   │   ├── dto/                        # domain data shapes
│   │   ├── port/                       # ports (interfaces)
│   │   │   ├── persistence/            # ports for the persistence adapter
│   │   │   ├── person/                 # external port (mocked)
│   │   │   └── request/                # use-case ports
│   │   ├── service/                    # business logic + validation
│   │   ├── requesthandler/             # implementations of the use-case ports
│   │   └── error/                      # typed error hierarchy (no HTTP status)
│   ├── persistence/                    # MySQL adapter
│   │   ├── db.js                       # connection pool + lifecycle
│   │   ├── entity/                     # row shapes
│   │   ├── mapper/                     # Entity ↔ DTO
│   │   ├── repository/                 # raw SQL via mysql2/promise
│   │   ├── service/                    # persistence services (port impls)
│   │   └── errors/                     # MySQL error → AppError translation
│   ├── personmock/                     # external port mock adapter
│   └── rest/                           # HTTP adapter
│       ├── controller/                 # Express routers per resource
│       ├── factory/                    # request → DTO factories
│       ├── request/                    # request shapes
│       └── controller/advice/          # global error handler (owns the code→HTTP map)
├── tests/
│   ├── unit/                           # mapper / service / handler / factory tests
│   ├── integration/                    # Supertest against the full app (in-memory)
│   └── jest.setup.js
├── .env.example
├── eslint.config.js
├── jest.config.js
├── package.json
└── README.md
```

## Architecture

The `domain/` package never imports anything from `persistence/`, `rest/`
or `personmock/`. It only depends on the ports it owns. The reverse
dependency is wired explicitly in `src/config/container.js`:

```
                  ┌────────────────────────┐
                  │        domain/         │
                  │  (DTO, ports, services)│
                  └────────────┬───────────┘
                               │ depends only on
                               ▼
        ┌──────────────────────────────────────┐
        │  domain/port/{persistence,person,…}   │   ← interfaces
        └────────────┬───────────────┬──────────┘
                     │               │
        implemented by│               │implemented by
                     ▼               ▼
   ┌────────────────────┐   ┌────────────────────┐
   │   persistence/     │   │    personmock/     │
   │  (MySQL adapter)   │   │   (mock adapter)   │
   └────────────────────┘   └────────────────────┘
                     ▲               ▲
                     │  injected by  │
                     └───────┬───────┘
                             ▼
                    ┌─────────────────┐
                    │      rest/      │  ← HTTP adapter (Express)
                    └─────────────────┘
```

The composition root (`config/container.js`) builds the full graph in
one place. The same factory is reused for tests via an `overrides`
parameter that lets you swap any dependency (e.g. an in-memory fake
persistence service) without touching the layers above it.

## Domain model

```
CATEGORY 1 ── * CATEGORY_TAXES    (a category has many tax brackets;
                                   each bracket = min revenue + rate %)
   │
   │ 1
   │
   ▼ *
ACTIVITY ── * TAX                  (an activity belongs to a category
                                   and has many periodic tax declarations)
```

- `CATEGORY_TAXES.AMOUNT` is the lower bound of a bracket
  (rate applies to revenue ≥ AMOUNT). The bracket with the highest
  AMOUNT not exceeding the revenue wins.
- `ACTIVITY.CATEGORY_ID` is non-nullable.
- `TAX.MANAGER_*` columns are denormalised (the Person system is
  mocked for now, see `personmock/`).

## API

### Categories

| Method | Path                | Body                                                   | Response                  |
| ------ | ------------------- | ------------------------------------------------------ | ------------------------- |
| POST   | `/category`         | `{ name, categoryTaxes: [{ amount, rate }] }`          | `CategoryDTO`             |
| GET    | `/category`         | —                                                      | `Page<CategoryDTO>`       |
| PATCH  | `/category/:id`     | `{ name, categoryTaxes: [...] }`                        | `CategoryDTO`             |
| DELETE | `/category/:id`     | —                                                      | `200 OK` (empty body)     |

### Activities

| Method | Path                      | Body                                                | Response                |
| ------ | ------------------------- | --------------------------------------------------- | ----------------------- |
| POST   | `/activity/:categoryId`   | `{ name, address, managementIds?: number[] }`       | `ActivityDTO`           |
| GET    | `/activity`               | —                                                   | `Page<ActivityDTO>`     |
| PATCH  | `/activity/:id`           | `{ name, managementIds?: number[] }`                | `ActivityDTO`           |
| DELETE | `/activity/:id`           | —                                                   | `200 OK` (empty body)   |

### Taxes

| Method | Path                  | Body                                                              | Response           |
| ------ | --------------------- | ----------------------------------------------------------------- | ------------------ |
| POST   | `/tax/:activity`      | `{ earnings, expenses, managerName, managerSurname }`            | `TaxDTO`           |
| GET    | `/tax/:activity`      | —                                                                 | `Page<TaxDTO>`     |
| GET    | `/tax`                | —                                                                 | `Page<TaxDTO>`     |
| PATCH  | `/tax/:id`            | `{ earnings?, expenses?, payed, elapsedDays? }`                  | `TaxDTO`           |

### Health

`GET /health` → `{ status: 'ok', db: 'up' }` (or `503` if MySQL is down).

### Pagination

`?page=0&size=20&sort=id,desc` on any list endpoint. Defaults: `page=0`,
`size=20`. `size` is capped at 200.

Response shape:

```json
{
  "data": [ ... ],
  "page": 0,
  "size": 20,
  "total": 42,
  "totalPages": 3
}
```

### Error responses

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": ["name: Name must be set"] } }
```

| Status | Code              | When                                            |
| ------ | ----------------- | ----------------------------------------------- |
| 400    | `VALIDATION_ERROR`| DTO fails Zod validation                        |
| 400    | `INVALID_JSON`    | Malformed JSON body                             |
| 404    | `NOT_FOUND`       | Update/delete on a non-existent id              |
| 500    | `INTERNAL_ERROR`  | Anything else                                   |

## Tax computation rules

Implemented in `domain/service/TaxService.js`. Given an insert request:

```
revenue              = earnings - expenses
rate                 = highest CategoryTax bracket with amount ≤ revenue
                        (0% if the activity has no category taxes; never persisted,
                         recomputed from the activity's category on every write)
taxableIncome        = revenue × rate / 100
                        (the tax owed on the income — the base tax)
elapsedDays          = (days since last declaration for the same activity) − 7
                        (0 if no previous declaration, or < 7 days have passed)
elapsedBillAmount    = elapsedDays × 15000
                        (the late-filing penalty)
taxAmount            = taxableIncome + elapsedBillAmount
                        (total liability: tax owed + late-filing penalty)
declarationDate      = now()
```

A field omitted from the body on `PATCH` is treated as "no change"
— the persisted value is preserved. A literal `0` is a valid patch
value (NOT a sentinel).

## Configuration

All configuration is loaded and validated by `src/config/env.js` (Zod) on
first access. A missing or malformed variable raises a clear error
before the first request is served.

| Variable             | Default     | Description                          |
| -------------------- | ----------- | ------------------------------------ |
| `NODE_ENV`           | development | `development` / `test` / `production`|
| `PORT`               | 3000        | HTTP port                            |
| `DB_HOST`            | —           | MySQL host                           |
| `DB_PORT`            | 3306        | MySQL port                           |
| `DB_USER`            | —           | MySQL user                           |
| `DB_PASSWORD`        | —           | MySQL password                       |
| `DB_NAME`            | —           | Database name                        |
| `DB_CONNECTION_LIMIT`| 10          | Pool size                            |
| `LOG_LEVEL`          | info        | Pino level (`fatal`/`error`/`warn`/`info`/`debug`/`trace`) |

## Running it

### 1. Start MySQL

```sh
cd db
docker compose -f mysql-burocracy.yml up -d
```

This creates the database, applies the full schema (`01_init.sql`),
and seeds a few rows of mock data (`02_populate.sql`). Both files
are loaded in ASCII order by the Docker entrypoint; the numeric
prefixes (`01_`, `02_`) are deliberate and sort in the obvious
order. Every statement is guarded for idempotency, so re-running
the scripts against a populated database is safe.

### 2. Install deps and start the service

```sh
cp .env.example .env
npm install
npm run dev      # node --watch
# or
npm start
```

Service listens on `PORT` (default `3000`).

### 3. Smoke test

```sh
curl -s http://localhost:3000/health
```

## Tests

The test suite has **no database requirement** — the integration tests
wire a fully in-memory container (`tests/integration/app.test.js`)
using `createApp({ container: ... })`.

```sh
npm test                   # everything
npm run test:unit          # mapper / service / handler / factory tests
npm run test:integration   # Supertest against the full app
```

What's covered:

- **Mappers**: round-trip `Entity ↔ DTO`, null guards, manager columns flattening.
- **Services** (`ActivityService`, `CategoryService`, `TaxService`): validation,
  business rules (revenue, tax rate by category bracket, elapsed days, payed
  semantics), NotFound on missing entities, `findAll`/`delete` delegation.
- **Request handlers**: verify they resolve the related port (e.g. category
  for an activity) before delegating to the service.
- **Factories**: Insert vs Update dispatch, "Invalid Request" branch.
- **Integration (HTTP)**: end-to-end flows for every endpoint, plus the
  global error handler.

## Operational notes

- **Graceful shutdown**: SIGTERM/SIGINT close the HTTP server and the
  MySQL pool, with a 10 s safety net.
- **Hardening**: `helmet()`, CORS with explicit origin, JSON body limit
  of 100 KB.
- **No ORM**: queries are explicit SQL — easier to read and to audit.
- **No `any`**: the codebase uses JSDoc type annotations throughout;
  the DTOs, mappers, and ports document their contracts explicitly.
