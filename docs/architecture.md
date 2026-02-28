# Architecture — Flyme

## Overview

Flyme is a three-tier web application:

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│   React 18 + Vite                                           │
│   ├── Search UI (origin, dest, dates, cabin, programs)      │
│   ├── Results UI (award options ranked by value)            │
│   ├── Transfer Advisor UI (streaming LLM recommendations)   │
│   └── Vercel AI SDK hooks (useChat, useCompletion)          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / SSE (streaming)
┌──────────────────────▼──────────────────────────────────────┐
│                    Express API Server                        │
│   ├── /api/search      — flight search orchestration        │
│   ├── /api/transfers   — transfer path queries              │
│   ├── /api/chat        — LLM advisor (streaming)            │
│   ├── /api/programs    — loyalty program data               │
│   └── /api/users       — auth & balance management          │
│                                                             │
│   Services                                                  │
│   ├── FlightSearchService   (aggregates availability APIs)  │
│   ├── TransferGraphService  (graph traversal, CPP calc)     │
│   ├── LLMAdvisorService     (Anthropic tool_use + stream)   │
│   └── CacheService          (Redis read-through)            │
└──┬──────────┬──────────┬──────────────────────────┬─────────┘
   │          │          │                          │
   ▼          ▼          ▼                          ▼
PostgreSQL  Redis   Anthropic API           External Flight APIs
(Prisma)   (cache)  (Claude claude-sonnet-4-6)  (seats.aero, Amadeus)
```

---

## Package Structure

The repository is a **pnpm monorepo** with three packages:

### `packages/shared`
Shared TypeScript types and Zod schemas. Has zero runtime dependencies beyond
`zod`. Both `client` and `server` import from this package as `@flyme/shared`.

Key exports:
- `types/flights.ts` — `Flight`, `AwardOption`, `CabinClass`, `SearchParams`
- `types/programs.ts` — `LoyaltyProgram`, `TransferPartner`, `TransferRule`
- `types/points.ts` — `PointsBalance`, `TransferPath`, `CentsPerPoint`
- `schemas/search.ts` — Zod schema for search form validation (shared between
  client form and server request validation)

### `packages/server`
Express 5 application. TypeScript, compiled to `dist/` for production.

```
server/src/
├── index.ts            # App entry point, server bootstrap
├── config.ts           # Env var validation (Zod)
├── routes/
│   ├── search.ts       # POST /api/search
│   ├── transfers.ts    # GET  /api/transfers
│   ├── chat.ts         # POST /api/chat (SSE stream)
│   ├── programs.ts     # GET  /api/programs
│   └── users.ts        # Auth routes
├── services/
│   ├── flights/
│   │   ├── FlightSearchService.ts   # Orchestrates adapters
│   │   ├── adapters/
│   │   │   ├── SeatsAeroAdapter.ts  # seats.aero API client
│   │   │   └── AmadeusAdapter.ts    # Amadeus API client
│   │   └── types.ts
│   ├── rewards/
│   │   ├── TransferGraphService.ts  # Partner graph + CPP
│   │   ├── ProgramDataService.ts    # Seeded program rules
│   │   └── types.ts
│   └── llm/
│       ├── LLMAdvisorService.ts     # Main orchestrator
│       ├── streamAdvisor.ts         # Streaming helper
│       └── types.ts
├── tools/               # Anthropic tool_use definitions
│   ├── searchAwardFlights.ts
│   ├── getTransferPartners.ts
│   ├── calculateTransferValue.ts
│   ├── lookupProgramRules.ts
│   └── index.ts         # Re-exports all tools
├── middleware/
│   ├── asyncHandler.ts  # Wraps async route handlers
│   ├── errorHandler.ts  # Global error middleware
│   ├── rateLimiter.ts   # Per-route rate limiting
│   └── auth.ts          # JWT auth (future)
└── db/
    ├── client.ts        # Prisma client singleton
    └── migrations/      # Prisma migrations
```

### `packages/client`
Vite + React 18 single-page application.

```
client/src/
├── main.tsx            # App entry
├── App.tsx             # Root, routing (React Router v6)
├── components/         # Shared, reusable UI primitives
│   ├── Button/
│   ├── Card/
│   ├── Badge/          # Cabin class, program logos
│   ├── Skeleton/       # Loading states
│   └── StreamingText/  # Renders streaming LLM responses
├── features/
│   ├── search/         # Flight search form + results
│   │   ├── SearchForm.tsx
│   │   ├── ResultsList.tsx
│   │   ├── AwardCard.tsx
│   │   └── useFlightSearch.ts   # React Query + API call
│   ├── transfers/       # Transfer path visualization
│   │   ├── TransferMap.tsx
│   │   ├── PathExplainer.tsx
│   │   └── useTransferPaths.ts
│   └── chat/            # LLM advisor chat interface
│       ├── ChatPanel.tsx
│       ├── MessageBubble.tsx
│       └── useAdvisorChat.ts    # Vercel AI SDK useChat
├── hooks/
│   ├── usePointsBalance.ts
│   └── usePrograms.ts
├── lib/
│   ├── api.ts           # Typed fetch wrapper (ky)
│   └── formatters.ts    # CPP, miles, date formatters
└── types/               # Client-only types (UI state, etc.)
```

---

## Core Data Flows

### 1. Award Flight Search

```
User fills SearchForm
        │
        ▼
useFlightSearch hook
  POST /api/search { origin, dest, date, cabin, programs[] }
        │
        ▼
  FlightSearchService.search()
  ├── Fan out to enabled adapters (SeatsAeroAdapter, AmadeusAdapter)
  │   └── Check Redis cache first (key: search:{hash}, TTL: 15m)
  ├── Merge and deduplicate results
  ├── Enrich with TransferGraphService (which programs have the miles?)
  └── Rank by cents-per-point
        │
        ▼
  Return AwardOption[] → ResultsList.tsx
```

### 2. LLM Transfer Advisor (Streaming)

```
User sends message in ChatPanel
        │
        ▼
useAdvisorChat (Vercel AI SDK useChat)
  POST /api/chat { messages[], userBalances? }
        │
        ▼
  LLMAdvisorService.streamResponse()
  ├── Prepend system prompt with program data context
  ├── Call Anthropic Messages API (stream: true)
  └── Tool use loop:
      ├── Model decides which tool(s) to call
      ├── Server executes tool (e.g., searchAwardFlights, getTransferPartners)
      ├── Results fed back to model
      └── Repeat until model returns final text
        │
        ▼
  SSE stream → StreamingText.tsx renders token-by-token
```

### 3. Transfer Path Query

```
User selects an award option
        │
        ▼
useTransferPaths hook
  GET /api/transfers?from=chase_ur&to=AC&amount=50000
        │
        ▼
  TransferGraphService.findPaths()
  ├── Load partner graph (Redis cache, TTL: 24h)
  ├── BFS/Dijkstra over transfer graph
  ├── Apply transfer rules (ratios, fees, minimums, bonuses)
  └── Score paths by effective CPP and transfer time
        │
        ▼
  Return TransferPath[] → TransferMap.tsx + PathExplainer.tsx
```

---

## Database Schema (Planned)

```
LoyaltyProgram
  id, name, slug, type (credit_card | airline | hotel)
  pointCurrency, baselineCpp (cents)

TransferPartner
  fromProgramId, toProgramId
  transferRatio (e.g., 1.0 = 1:1)
  transferFeePercent
  minTransferAmount
  transferTimeDays (e.g., 2 for instant, 3 for 3 business days)
  bonusPercent (for promotional bonuses)
  isActive

AwardChart
  programId, partnerCarrier
  cabin, region/zone
  milesRequired
  effectiveDate, expiryDate

SavedSearch
  userId, searchParams (JSONB)
  createdAt

User
  id, email, passwordHash
  createdAt

UserPointsBalance
  userId, programId
  balance, lastUpdatedAt
```

---

## External API Integration Strategy

### seats.aero
The primary source for live award availability. Provides a REST API to query
available award seats by route and date across many airline programs.

- Cache results for 15 minutes (award space changes frequently but not per-second)
- Store raw responses in Redis, parsed `AwardOption[]` in PostgreSQL for history
- Handle 429 rate limits with exponential backoff

### Amadeus
Used for flight schedules, routing context, and cash price anchoring (to calculate
CPP comparisons). Not award inventory.

- Cache schedule data for 1 hour
- Used primarily to validate that a route exists and to display flight times

### Future: Point.me / AwardHacker
These services aggregate transfer partner data and award valuations. Consider
integrating their data as a fallback or cross-reference for partner graphs.

---

## Scalability Considerations

- All LLM calls are async and streamed — the server never blocks waiting for Claude
- Redis is the hot path for all repetitive data (searches, partner graphs)
- The `TransferGraphService` builds an in-memory graph on startup from the DB;
  this graph is refreshed every 6 hours (or on admin trigger)
- Flight search adapters are pluggable — adding a new source means implementing
  the `FlightSearchAdapter` interface and registering it
- The LLM tool layer is stateless — tools take inputs and return JSON; they never
  hold state, making it easy to add or remove tools independently
