# Development Guide — Flyme

## Prerequisites

| Tool | Minimum Version | Install |
|---|---|---|
| Node.js | 20.x LTS | https://nodejs.org or `nvm install 20` |
| pnpm | 9.x | `npm install -g pnpm` |
| PostgreSQL | 15.x | `brew install postgresql@15` / Docker |
| Redis | 7.x | `brew install redis` / Docker |
| Git | 2.x | pre-installed on most systems |

Optional but recommended:
- **Docker Desktop** — run Postgres and Redis without local installs
- **VS Code** with the extensions: ESLint, Prettier, Prisma, TypeScript Hero

---

## Initial Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/flyme.git
cd flyme
pnpm install
```

`pnpm install` installs dependencies for all packages in the workspace.

### 2. Start infrastructure (Docker)

If you prefer Docker over local installs:

```bash
docker compose up -d
```

The `docker-compose.yml` in the repo root starts Postgres on port 5432 and Redis
on port 6379.

### 3. Configure environment variables

```bash
cp packages/server/.env.example packages/server/.env
```

Open `packages/server/.env` and fill in:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flyme_dev

# Redis
REDIS_URL=redis://localhost:6379

# LLM
ANTHROPIC_API_KEY=sk-ant-api03-...

# External flight data (optional for initial development)
SEATS_AERO_API_KEY=
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
```

### 4. Set up the database

```bash
# Apply all migrations
pnpm --filter server db:migrate

# Seed with program data
pnpm --filter server db:seed
```

### 5. Start the development servers

```bash
# Start everything (client + server) with hot reload
pnpm dev
```

Or start them separately:

```bash
# Terminal 1 — API server (port 3001)
pnpm --filter server dev

# Terminal 2 — React client (port 5173)
pnpm --filter client dev
```

Open `http://localhost:5173`.

---

## Development Scripts

All commands run from the **repo root** unless noted.

### Build

```bash
pnpm build              # Build all packages
pnpm --filter server build
pnpm --filter client build
pnpm --filter shared build
```

### Test

```bash
pnpm test               # Run all unit + integration tests (Vitest)
pnpm test:watch         # Watch mode
pnpm test:coverage      # Coverage report
pnpm test:e2e           # Playwright end-to-end (requires running dev server)
```

### Type Checking

```bash
pnpm typecheck          # Type-check all packages in parallel
```

### Linting & Formatting

```bash
pnpm lint               # ESLint all packages
pnpm lint:fix           # ESLint with auto-fix
pnpm format             # Prettier write
pnpm format:check       # Prettier check (used in CI)
```

### Database

```bash
pnpm --filter server db:migrate      # Apply pending migrations
pnpm --filter server db:migrate:dev  # Create + apply a new migration interactively
pnpm --filter server db:seed         # Seed programs, partners, rules
pnpm --filter server db:reset        # Drop, recreate, migrate, seed (⚠ destructive)
pnpm --filter server db:studio       # Open Prisma Studio (visual DB editor)
```

---

## Project Conventions

### Branch Naming

```
feat/<short-description>      # new feature
fix/<short-description>       # bug fix
refactor/<short-description>  # refactoring
docs/<short-description>      # documentation
chore/<short-description>     # tooling, deps, config
```

### Commit Messages (Conventional Commits)

```
feat: add seats.aero adapter for award search
fix: correct transfer ratio for Amex MR → ANA
docs: add CPP calculation explanation to data model
refactor: extract transfer graph into separate service
test: add integration tests for /api/search route
chore: upgrade Prisma to 5.9
```

Keep commits atomic — one logical change per commit. Squash before merging if
a PR has noisy "WIP" commits.

### Pull Requests

1. Open a PR from your feature branch into `master`
2. Fill in the PR template (auto-populated from `.github/pull_request_template.md`)
3. Ensure CI is green (lint, typecheck, tests)
4. Request review from at least one team member
5. Squash and merge (keep history clean)

---

## Adding a New Package

If a new top-level package is needed (e.g., a CLI tool, a background job worker):

1. Create the directory: `packages/<name>/`
2. Add `package.json` with `"name": "@flyme/<name>"`
3. The workspace root `pnpm-workspace.yaml` already globs `packages/*`, so it
   will be picked up automatically
4. Add shared scripts to the root `package.json` using `--filter`

---

## Environment Details

### Workspace Packages

| Package | Name | Purpose |
|---|---|---|
| `packages/shared` | `@flyme/shared` | Shared types and Zod schemas |
| `packages/server` | `@flyme/server` | Express API server |
| `packages/client` | `@flyme/client` | React SPA |

Cross-package imports use workspace protocol:
```json
"@flyme/shared": "workspace:*"
```

TypeScript `paths` are configured in each `tsconfig.json` to resolve `@flyme/shared`
directly from source in development (no build step required).

### Port Reference

| Service | Port |
|---|---|
| React client (Vite) | 5173 |
| Express API server | 3001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Prisma Studio | 5555 |

---

## VS Code Configuration

The repo ships a `.vscode/settings.json` that configures:
- ESLint as the default formatter for `.ts` / `.tsx` files
- Format on save enabled
- TypeScript version pinned to the workspace version
- Prisma schema highlighting

Recommended extensions (`.vscode/extensions.json`):
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `prisma.prisma`
- `ms-playwright.playwright`

---

## Debugging

### Server

The server uses the `debug` package. Enable namespaced logs:

```bash
DEBUG=flyme:* pnpm --filter server dev
```

Namespaces:
- `flyme:http` — incoming requests and responses
- `flyme:llm` — Anthropic API calls and tool use
- `flyme:search` — flight search adapter calls
- `flyme:cache` — Redis hits and misses

### LLM Calls

Set `LOG_LLM_REQUESTS=true` in `.env` to log full Anthropic request/response
payloads to stdout (very verbose — dev only).

### Database

```bash
# Open Prisma Studio to inspect the database
pnpm --filter server db:studio
```

---

## CI Pipeline

CI runs on every PR via GitHub Actions (`.github/workflows/ci.yml`):

1. `pnpm install` — install dependencies
2. `pnpm typecheck` — TypeScript compilation check
3. `pnpm lint` — ESLint
4. `pnpm format:check` — Prettier
5. `pnpm test` — unit and integration tests
6. `pnpm build` — production build check

All five jobs must pass before a PR can be merged.

---

## Common Issues

### `prisma migrate dev` fails with "database does not exist"

Make sure Postgres is running and `DATABASE_URL` is correct. If using Docker:
```bash
docker compose up -d
```

### TypeScript cannot find `@flyme/shared`

Run `pnpm --filter shared build` first, or ensure `tsconfig.json` has the correct
`paths` entry pointing to `../../shared/src`.

### LLM calls timeout in development

The default Anthropic timeout is 60s. If you're on a slow connection, increase it
in `packages/server/src/services/llm/LLMAdvisorService.ts`:
```typescript
const anthropic = new Anthropic({ timeout: 120_000 });
```

### `pnpm install` fails with peer dependency errors

Ensure you're using pnpm 9.x. Run `pnpm --version` to check, then
`npm install -g pnpm@latest` to upgrade.
