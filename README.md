# Group Travel Matcher: backend

REST API for Hackathon Problem 3. Travellers sign up, post a trip (a group) or search for one. A search returns groups that pass all six matching rules, ranked by fit, plus near misses that fail exactly one rule. The seeker requests to join, the owner approves or rejects, and members then pick and book one hotel together.

Node 24, TypeScript, Express, Drizzle, PostgreSQL, Zod, Vitest.

## Run

Needs Node 24, pnpm and a PostgreSQL database (local or hosted).

    cp .env.example .env
    pnpm install
    pnpm dev

Edit `.env` before the first start:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `AUTH_SECRET` | Signs login tokens. At least 32 characters. `openssl rand -hex 32` |
| `DEMO_PASSWORD` | Password of the seeded travellers. Default `demo1234`. |
| `DEMO_SWITCH` | `true` lets anyone enter a seeded traveller without a password. Default `true`. Set `false` outside demos. |
| `PORT` | Default `8000`. |
| `DATA_DIR` | Path to the data pack. The default is correct. |

`pnpm dev` applies migrations, seeds the data pack if the database is empty, then listens on `:8000`. With a hosted database the first start can take up to a minute. Wait for `Server running`.

- API: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/api-docs`
- Health: `http://localhost:8000/health`

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Start with file watching. |
| `pnpm start` | Start without watching. |
| `pnpm test` | Unit and API tests on in-memory Postgres (PGlite). Never touches `DATABASE_URL`. |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:reset` | Drop all tables, migrate, seed again. Deletes everything. |
| `pnpm db:generate` | Create a migration after a schema change in `src/db/schema`. |

## Auth

`POST /api/travellers` (sign up) and `POST /api/travellers/sign-in` return the traveller with a `token`. Send it on every other call:

    Authorization: Bearer <token>

Tokens last 7 days. While `DEMO_SWITCH` is on, `POST /api/travellers/demo/sign-in` with `{ "id": "T-001" }` returns a token for a seeded traveller with no password. Accounts created through sign-up are never reachable this way. Seeded travellers sign in as `<id>@demo.travel`, for example `t-001@demo.travel`, with `DEMO_PASSWORD`.

## Matching rules

A group matches a search when all six pass. The same check runs again when a join request is created, so the rules cannot be skipped by calling the API directly.

1. Same city.
2. At least 2 shared nights.
3. Budgets within 40% of the lower one.
4. At least 2 interests shared with the owner.
5. Gender. Each trip is `ANY` or `SAME_GENDER`, set when the trip is created. A `SAME_GENDER` trip only takes travellers of the owner's gender. A seeker searching with `SAME_GENDER` only matches groups whose members all share their gender. Checked again on approval.
6. A free seat.

Thresholds are in `src/config/businessRules.ts`.

## Layout

    src/routes        URL to controller
    src/controllers   HTTP in and out
    src/services      business logic
    src/repositories  SQL
    src/utils         pure functions: rules, ranking, dates, cost, auth
    src/db/schema     tables
    src/__tests__     API tests
    drizzle/          migrations, applied on start

Responses are `{ success, message, data }` or `{ success: false, message, error }`.

## Problems

- `AUTH_SECRET is missing`: add it to `.env`. nodemon does not watch `.env`, so type `rs` or restart.
- `ECONNREFUSED 127.0.0.1:8000` in the frontend: this server is not up yet, or it crashed. Check this terminal.
- `column ... does not exist`: a migration has not run. Restart the server.

## Bounded discovery responses

Group search applies matching rules and shared-interest/gender filters before ranking and limiting responses to 50 matches and 50 near misses. Responses include totalMatches, totalNearMisses and limits; the frontend pages matches eight at a time. Home city is recorded but does not affect compatibility.

Normal startup does not require resetting the database. Keep existing demo and user data; reserve db:reset for disposable development databases.

