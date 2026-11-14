# Travel Together: Backend

Express, TypeScript and PostgreSQL API for matching travellers, approving members, booking stays, friends and chat. Bookings are demo confirmations, without payments.

## Features

* Sign-up and sign-in with signed Bearer tokens, plus demo-traveller switching
* Group creation and discovery, with six eligibility rules, weighted ranking and near-miss suggestions
* Join requests that the group owner approves or rejects
* Hotel search from a read-only catalogue, saved options, equal cost split and mock group booking
* Friends (mutual requests), persistent group chat, and OpenAPI docs at `/api-docs`

## Tech stack

Node.js 24, Express 4, TypeScript, Zod validation, Drizzle ORM on PostgreSQL (local or Neon), Swagger UI, and Vitest with an in-memory PGlite database for tests.

## Getting started

Needs Node.js 24 LTS, Git and an empty PostgreSQL database (local or [Neon](https://neon.tech)).

```sh
git clone https://github.com/Ajaybalajiprasad/2FA-MATCHER-BE.git
cd 2FA-MATCHER-BE
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
```

Edit `.env` (see the table below), then start the API:

```sh
pnpm dev
```

Wait for `Server running on http://localhost:8000`. Migrations run and the demo data loads automatically on first start, so no manual seed is needed. Check [health](http://localhost:8000/health) or [Swagger](http://localhost:8000/api-docs).

### Environment

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | local `travel_matcher` database | Any PostgreSQL URL, local or Neon |
| `DATABASE_TRANSPORT` | `tcp` | Use `websocket` for Neon on a network that blocks port 5432 |
| `AUTH_SECRET` | placeholder | Replace with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | `8000` | API port |
| `DATA_DIR` | bundled data pack | Read-only catalogue and demo data |
| `DEMO_PASSWORD` | `demo1234` | Password for the demo travellers |
| `DEMO_SWITCH` | `true` | Set `false` to turn off demo-traveller switching |

## How matching works

A search runs six checks against every open group: same destination, at least 2 shared nights, budgets within 40% of each other, at least 2 shared interests with the owner, gender preferences, and a free seat. A group that passes all six is a match. A group that fails exactly one (other than destination) is returned as a near miss with a suggested fix. Matches are ranked out of 100 by interests (40), dates (30), budget (20) and open seats (10), and each result lists the outcome of every rule. Thresholds live in `src/config/businessRules.ts`.

## API overview

All routes are under `/api`. The full list is in Swagger.

| Area | Routes |
| --- | --- |
| Meta | `GET /meta` (cities, interests, rules and limits) |
| Travellers | `POST /travellers`, `POST /travellers/sign-in`, `GET /travellers/demo`, `POST /travellers/demo/sign-in`, `GET /travellers/:id`, `GET /me` |
| Matching | `POST /matches/search` |
| Groups | `POST /groups`, `GET /groups/mine`, `GET /groups/:id` |
| Join requests | `GET /requests/mine`, `PATCH /requests/:id`, `/groups/:id/requests` |
| Planning | `GET /groups/:id/hotels`, `/groups/:id/saved`, `/groups/:id/booking` |
| Chat | `GET` and `POST /groups/:id/messages` |
| Friends | `/friends`, `/friends/requests`, `/friends/:travellerId` |

Responses use one envelope: `{ success, message, data }` on success and `{ success: false, message, error: { code } }` on failure.

## Project structure

Code flow: `src/routes` → `controllers` → `services` → `repositories` → database.

```
src/
  routes/ validators/ controllers/   HTTP layer, Zod schemas
  services/ utils/                   business logic and pure rule code
  repositories/ db/                  Drizzle queries, schema, seed
  middleware/ config/ docs/          auth, validation, rules and env, OpenAPI
drizzle/                             SQL migrations
hackathon-problem-3-.../             read-only data pack and hotel images
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start with nodemon, apply migrations, seed if empty |
| `pnpm test` | Run the Vitest suite on an isolated in-memory database |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm db:generate` | Generate a Drizzle migration from the schema |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:reset` | Reset the database |

Next, start the [frontend](https://github.com/hydro-7/2FA-MATCHER-FE).
