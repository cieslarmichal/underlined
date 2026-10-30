# CLAUDE.md

## Project Overview

## Commands

```bash
# Build
npm run build
npm run build:dev # Development build (with tests)
npm run build:dev --workspace=@apps/backend
npm run build:dev --workspace=@apps/frontend

# Test
npm run test

# Lint
npm run lint
npm run lint:fix

# Install packages
npm i <package> # Shared dependency
npm i <package> --workspace=@apps/backend
npm i <package> --workspace=@apps/frontend
```

**AFTER every change:** `npm run build:dev` — verifies Typescript build
**AFTER task completed:** `npm run test` — runs full suite of tests

Local dev requires PostgreSQL. Use `docker-compose.yml` to spin up the database.

Database migrations live in `apps/backend/drizzle/`. Run via Drizzle Kit from `apps/backend`:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
npm run db:generate   # generate migration from schema changes
npm run db:migrate    # apply pending migrations
```

When adding a `NOT NULL` column to a table with existing rows, edit the generated SQL to: add as nullable → backfill → set NOT NULL.

## Architecture

This is a **Turborepo monorepo** with npm workspaces:

- `apps/backend` — Fastify REST API
- `apps/frontend` — React SPA (Vite)
- `apps/backend/drizzle` — Drizzle migrations

### Backend (`apps/backend/src/`)

Follows **Clean Architecture** with feature modules:

```
core/           — App lifecycle, HTTP server, config, email queue
common/         — Cross-cutting services: auth, crypto, email, errors, id, image optimization, logger, S3
infrastructure/ — Drizzle DB client, schema, transaction management
modules/        — Feature modules
```

Each feature module is structured as:
```
module/
├── application/
│   ├── actions/     — Use case classes (one action = one business operation)
│   └── services/    — Business logic services
├── domain/types/    — Domain models and interfaces
└── infrastructure/repositories/  — Drizzle data access
```

Routes are registered as Fastify plugins. Transaction boundaries are defined in the actions layer. Auth middleware (`onRequest` hook) validates JWT and account status.

**Auth flow**: Access token (JWT, in-memory, short-lived) + Refresh token (HTTP-only cookie, long-lived, rotation with grace period).

**Error types** to use from `src/common/errors/`:
`InputNotValidError`, `ResourceNotFoundError`, `OperationNotValidError`, `ResourceAlreadyExistsError`, `UnauthorizedAccessError`, `ForbiddenAccessError`

### Frontend (`apps/frontend/src/`)

```
pages/      — Page components (lazy-loaded via React.lazy)
components/ — Reusable components (ui/ contains Radix UI wrappers)
context/    — AuthContext + AuthContextProvider (global auth state)
auth/       — Route guards: privateRoute, publicRoute
api/        — REST API query functions and types
hooks/      — Custom hooks (useDebounce, useSEO)
config.ts   — Site metadata (name, URL, contact) + backend URL. Rebrand here first.
```

Routing is in `App.tsx` using React Router v7 with loaders. Forms use React Hook Form + Zod. Global auth state lives in `AuthContext`.

**UI components**: Always use predefined components from `components/ui/` instead of plain HTML elements. Key components:

- `Button` — all clickable buttons (use `variant` prop: `default`, `outline`, `ghost`, `secondary`, `destructive`, `link`)
- `Input` — text inputs
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` — dropdowns
- Never use raw `<button>`, `<input>`, `<select>` when a `components/ui/` equivalent exists.

## Key Conventions

### TypeScript

- Strict mode. No `any`, no `@ts-ignore`, no eslint disables.
- No TypeScript enums — use `const` objects or union types.
- No constructor property declarations — use traditional assignment.
- ES module syntax throughout (`"type": "module"`).

### Backend

- Use `LoggerService` (Pino) everywhere — never `console.log`.
- Never log passwords, tokens, or PII.
- All multi-step writes go in Drizzle transactions with serializable isolation.
- TypeBox schemas for all request/response validation.
- UUIDs v7 for primary keys, `snake_case` for DB columns and tables.
- Config loaded from `config/` JSON files, validated with TypeBox at startup via `createConfig()`.
