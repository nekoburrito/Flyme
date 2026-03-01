# Flyme

> Find and book the best award flights by letting AI optimize your credit card points.

Flyme is an open-source rewards travel search engine that helps you:

- **Search award availability** across major airline programs
- **Map transfer paths** between credit card points (Chase UR, Amex MR, Citi TYP, Capital One, Bilt) and airline/hotel partners
- **Get AI-powered recommendations** on which program to book through, when to transfer, and how to maximize cents-per-point value
- **Compare redemption options** side-by-side with cash prices

---

## Why Flyme?

Most points search tools show you *what* is available. Flyme tells you *how to get
there* — accounting for your specific points balances, transfer bonuses, upcoming
trips, and the nuances of each loyalty program.

The AI advisor understands concepts like:
- Partner airline sweet spots (e.g., Aeroplan for Star Alliance long-haul)
- Transfer partner overlap (e.g., Chase → United vs Chase → Air Canada Aeroplan for the same flight)
- Positioning flight trade-offs
- Stopovers and open-jaw rules that add free legs to an itinerary

---

## Status

**Early development.** Core scaffolding in progress.

| Milestone | Status |
|---|---|
| Project scaffold & documentation | ✅ In progress |
| Shared TypeScript types & Zod schemas | Planned |
| Express API server skeleton | Planned |
| React frontend skeleton | Planned |
| LLM advisor (Anthropic tool_use) | Planned |
| seats.aero award availability integration | Planned |
| Transfer partner graph & rules engine | Planned |
| User accounts & points balance tracking | Planned |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express 5 + TypeScript |
| AI / LLM | Anthropic Claude (tool_use + streaming) |
| AI SDK | Vercel AI SDK (frontend streaming hooks) |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Monorepo | pnpm workspaces |

See [docs/architecture.md](docs/architecture.md) for the full system design.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/flyme.git
cd flyme

# Install dependencies
pnpm install

# Configure environment
cp packages/server/.env.example packages/server/.env
# Edit .env with your API keys and database URL

# Set up the database
pnpm --filter server db:migrate

# Start everything in dev mode
pnpm dev
```

The client runs at `http://localhost:5173` and the API at `http://localhost:3001`.

---

## Documentation

| Document | Description |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Instructions for AI coding agents |
| [docs/architecture.md](docs/architecture.md) | System design, data flow, and component map |
| [docs/development-guide.md](docs/development-guide.md) | Local setup, scripts, and workflow |
| [docs/api-design.md](docs/api-design.md) | REST API conventions and endpoint reference |
| [docs/llm-integration.md](docs/llm-integration.md) | LLM tool definitions, streaming patterns, and cost controls |
| [docs/rewards-data-model.md](docs/rewards-data-model.md) | Domain model for points programs, partners, and transfer rules |

---

## Contributing

Contributions are welcome. Please read [docs/development-guide.md](docs/development-guide.md)
before opening a PR. All PRs require passing CI and a linked issue.

---

## License

MIT
