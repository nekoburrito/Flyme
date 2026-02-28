# CLAUDE.md — Agent Instructions for Flyme

This file provides guidance for AI coding agents (Claude Code and similar) working
on the Flyme codebase. Read it fully before making any changes.

---

## Project Overview

**Flyme** is a rewards-flight search and recommendation engine that helps users:
1. Search for award flights using credit card points and airline miles
2. Discover optimal point transfer paths between credit card programs and airline partners
3. Receive LLM-powered recommendations for maximizing point value

The application is designed from day one for LLM augmentation — agents can call tools
to search flight inventory, look up transfer partners, and explain redemption strategy.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Streaming-friendly, Vercel AI SDK support, broad ecosystem |
| Backend | Express 5 + TypeScript | Familiar to team, easy LLM tool-calling integration |
| Monorepo | pnpm workspaces | Shared types between client/server without duplication |
| LLM SDK | Anthropic SDK (`@anthropic-ai/sdk`) | Tool use, streaming, structured output |
| AI Utilities | Vercel AI SDK (`ai`) | Frontend streaming hooks, provider abstraction |
| Data layer | PostgreSQL + Prisma | Typed queries, easy schema migrations |
| Caching | Redis | Rate-limit LLM calls, cache flight search results |

---

## Repository Layout

```
Flyme/
├── CLAUDE.md                  # This file
├── README.md                  # Human-facing overview
├── docs/                      # Extended documentation
│   ├── architecture.md        # System design and data flow
│   ├── api-design.md          # REST API conventions
│   ├── llm-integration.md     # LLM patterns and tool definitions
│   ├── rewards-data-model.md  # Points, partners, transfer rules
│   └── development-guide.md   # Setup, scripts, and workflow
├── packages/
│   ├── client/                # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/    # Shared UI components
│   │   │   ├── features/      # Feature-scoped modules
│   │   │   │   ├── search/    # Flight search UI
│   │   │   │   ├── transfers/ # Transfer recommendation UI
│   │   │   │   └── chat/      # LLM chat / advisor UI
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── lib/           # API client, utilities
│   │   │   └── types/         # Frontend-specific types
│   │   └── package.json
│   ├── server/                # Express API server
│   │   ├── src/
│   │   │   ├── routes/        # Express routers
│   │   │   ├── services/      # Business logic
│   │   │   │   ├── llm/       # LLM orchestration
│   │   │   │   ├── flights/   # Flight search adapters
│   │   │   │   └── rewards/   # Points / partner logic
│   │   │   ├── tools/         # LLM tool definitions (Anthropic tool_use format)
│   │   │   ├── middleware/    # Auth, error handling, rate limiting
│   │   │   ├── db/            # Prisma client and migrations
│   │   │   └── types/         # Server-specific types
│   │   └── package.json
│   └── shared/                # Shared TypeScript types (no runtime deps)
│       ├── src/
│       │   ├── types/         # Shared domain types
│       │   └── schemas/       # Zod schemas used on both sides
│       └── package.json
├── package.json               # Workspace root
└── pnpm-workspace.yaml
```

---

## Development Commands

Run all commands from the **repo root** unless noted otherwise.

```bash
# Install dependencies
pnpm install

# Start all packages in dev mode
pnpm dev

# Start only the API server
pnpm --filter server dev

# Start only the React client
pnpm --filter client dev

# Run all tests
pnpm test

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Build for production
pnpm build

# Database: apply migrations
pnpm --filter server db:migrate

# Database: open Prisma Studio
pnpm --filter server db:studio
```

---

## Coding Standards

### TypeScript
- Strict mode is enabled (`"strict": true`). Never use `any` — use `unknown` and
  narrow, or define a proper type.
- Prefer `type` over `interface` for domain objects; use `interface` for things
  that may be extended (React component props, Express middleware context).
- All shared domain types live in `packages/shared/src/types/`. Import from
  `@flyme/shared` in both client and server.

### React (Client)
- Functional components only. No class components.
- Co-locate component styles using CSS Modules or Tailwind utility classes.
- Feature modules own their own state via React Query (`@tanstack/react-query`).
  Global state is minimal — only auth and theme belong in a global store (Zustand).
- Use the Vercel AI SDK `useChat` / `useCompletion` hooks for LLM streaming UI.
- Never call Anthropic directly from the browser. All LLM calls go through the
  Express server.

### Express (Server)
- All route handlers are `async`. Wrap with a `asyncHandler` utility to forward
  errors to Express error middleware — never `try/catch` inside a route.
- Validate all incoming request bodies with Zod before touching them.
- Services return `Result<T, AppError>` (neverthrow) — never `throw` in service
  layer code.
- LLM calls live exclusively in `packages/server/src/services/llm/`. Nothing
  else imports the Anthropic SDK directly.

### LLM Tool Definitions
- Each Anthropic tool is defined in its own file under `packages/server/src/tools/`.
- Tools must have a `name`, `description`, and `input_schema` that matches a Zod
  schema. Generate the JSON schema from Zod using `zod-to-json-schema`.
- Keep tool descriptions precise — the model reads them to decide when to call.
- Document expected inputs and outputs with a JSDoc block above the definition.

### Naming Conventions
- Files: `kebab-case.ts`
- React components: `PascalCase.tsx`
- Types/interfaces: `PascalCase`
- Variables and functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database models (Prisma): `PascalCase`

---

## Environment Variables

All env vars are validated at startup via a Zod schema in
`packages/server/src/config.ts`. Add new vars there before using them.

```
# Server
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379

# LLM
ANTHROPIC_API_KEY=sk-ant-...

# External APIs (add as integrations are built)
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
SEATS_AERO_API_KEY=       # Award availability (seats.aero)
AWARD_WALLET_API_KEY=     # Award wallet tracking
```

Never commit secrets. Copy `.env.example` to `.env` locally.

---

## LLM Integration Principles

See `docs/llm-integration.md` for the full guide. Key rules:

1. **Tools over prompts for data** — use Anthropic tool_use to fetch structured
   flight/points data. Do not ask the model to make up data.
2. **Stream by default** — all user-facing LLM calls should stream their response
   so the UI feels responsive.
3. **Cache aggressively** — flight searches and transfer graphs change slowly.
   Cache tool call results in Redis with a TTL appropriate to the data type:
   - Award availability: 15 minutes
   - Transfer partner graphs: 24 hours
   - Airline program rules: 7 days
4. **Observe costs** — log token usage per request. Add a `usage` field to every
   LLM response stored in the DB.
5. **Fail gracefully** — if an LLM call fails, return the best non-LLM result
   and surface a clear message. Never block the entire search on LLM availability.

---

## Adding a New Feature

1. Define types in `packages/shared/src/types/` and update `zod` schemas.
2. Add a Prisma migration if new tables/columns are needed.
3. Implement service logic in `packages/server/src/services/`.
4. If the feature needs an LLM tool, add it to `packages/server/src/tools/`.
5. Add route(s) in `packages/server/src/routes/`.
6. Build the React feature module in `packages/client/src/features/<feature>/`.
7. Write tests: unit tests for services, integration tests for routes, component
   tests for React using Vitest + Testing Library.

---

## Git Workflow

- Branch from `master`: `git checkout -b feat/your-feature`
- Commit messages follow Conventional Commits:
  `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Keep commits atomic — one logical change per commit.
- Open a PR into `master`. CI must pass before merge.

---

## Key External Services

| Service | Purpose | Docs |
|---|---|---|
| seats.aero | Award seat availability search | Partner API |
| Amadeus | Flight schedules, pricing context | amadeus.com/en/developer |
| AwardHacker | Transfer partner value data | awardHacker.com |
| Point.me | Award search aggregation | point.me |
| Aeroplan / Chase UR / Amex MR / C1 / Citi TYP | Loyalty programs | Per program |

---

## Testing Strategy

- **Unit**: Vitest for all service and utility functions
- **Integration**: Supertest for Express routes with a test database
- **Component**: Vitest + @testing-library/react for React components
- **E2E**: Playwright (add when core flows are stable)

Run `pnpm test` to execute all unit and integration tests.
Run `pnpm test:e2e` for Playwright (requires a running dev server).
