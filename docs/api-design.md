# API Design — Flyme

## Conventions

### Base URL
All routes are prefixed with `/api`. In production, the API sits behind a reverse
proxy (e.g., Nginx or Caddy) and the client is served from the same domain.

### HTTP Methods
| Method | Use case |
|---|---|
| GET | Read-only queries (idempotent) |
| POST | Creating resources, triggering search (non-trivial params), LLM chat |
| PATCH | Partial updates |
| DELETE | Deletions |

### Request & Response Format
- **Content-Type**: `application/json` for all non-streaming endpoints
- **Streaming**: `text/event-stream` (SSE) for `/api/chat`
- All timestamps are ISO 8601 strings (e.g., `"2024-06-15T14:30:00Z"`)
- All point amounts are integers (miles / points are always whole numbers)
- Monetary values are integers in **cents** (avoids float precision bugs)

### Response Envelope

Success:
```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_01abc...",
    "durationMs": 342
  }
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [ ... ]
  },
  "meta": {
    "requestId": "req_01abc..."
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body or query param failed Zod validation |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `UPSTREAM_ERROR` | 502 | External API (seats.aero, Amadeus) returned an error |
| `LLM_UNAVAILABLE` | 503 | Anthropic API is down; structured results still returned |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### `POST /api/search`

Search for available award flights.

**Request body:**
```json
{
  "origin": "JFK",
  "destination": "NRT",
  "date": "2024-11-15",
  "returnDate": "2024-11-25",
  "cabin": "business",
  "passengers": 1,
  "programs": ["aeroplan", "united", "ana"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `origin` | string | yes | IATA airport or city code |
| `destination` | string | yes | IATA airport or city code |
| `date` | string (YYYY-MM-DD) | yes | Outbound date |
| `returnDate` | string (YYYY-MM-DD) | no | Omit for one-way |
| `cabin` | `economy \| premium_economy \| business \| first` | yes | |
| `passengers` | integer (1–9) | no | Default: 1 |
| `programs` | string[] | no | Filter to specific programs. Default: all |

**Response:**
```json
{
  "data": {
    "outbound": [
      {
        "id": "opt_01abc",
        "program": "aeroplan",
        "programDisplayName": "Air Canada Aeroplan",
        "carrier": "NH",
        "carrierDisplayName": "ANA",
        "flightNumbers": ["NH007"],
        "origin": "JFK",
        "destination": "NRT",
        "departureAt": "2024-11-15T11:45:00-05:00",
        "arrivalAt": "2024-11-16T15:30:00+09:00",
        "durationMinutes": 825,
        "cabin": "business",
        "milesRequired": 60000,
        "taxesCents": 5600,
        "seatsAvailable": 2,
        "centsPerPoint": 2.1,
        "cashPriceCents": 498000,
        "source": "seats_aero",
        "fetchedAt": "2024-10-01T09:00:00Z"
      }
    ],
    "return": [ ... ]
  }
}
```

---

### `GET /api/transfers`

Get transfer paths from a source program to a target airline/hotel program.

**Query params:**
| Param | Type | Required | Description |
|---|---|---|---|
| `from` | string | yes | Source credit card program slug (e.g., `chase_ur`) |
| `to` | string | yes | Target program slug (e.g., `aeroplan`) |
| `amount` | integer | yes | Points to transfer |

**Example:** `GET /api/transfers?from=chase_ur&to=aeroplan&amount=60000`

**Response:**
```json
{
  "data": {
    "paths": [
      {
        "steps": [
          {
            "from": "chase_ur",
            "to": "aeroplan",
            "ratio": 1.0,
            "pointsIn": 60000,
            "pointsOut": 60000,
            "transferTimeDays": 0,
            "bonusPercent": 0,
            "notes": "Instant transfer"
          }
        ],
        "totalPointsRequired": 60000,
        "totalTransferDays": 0,
        "effectiveCpp": 2.1
      }
    ]
  }
}
```

---

### `GET /api/programs`

List all supported loyalty programs.

**Query params:**
| Param | Type | Required | Description |
|---|---|---|---|
| `type` | `credit_card \| airline \| hotel` | no | Filter by type |

**Response:**
```json
{
  "data": {
    "programs": [
      {
        "slug": "chase_ur",
        "name": "Chase Ultimate Rewards",
        "type": "credit_card",
        "logoUrl": "/assets/programs/chase-ur.svg",
        "baselineCpp": 1.5,
        "transferPartnerCount": 14
      }
    ]
  }
}
```

---

### `GET /api/programs/:slug`

Get full detail for a single program including all transfer partners.

**Response:**
```json
{
  "data": {
    "slug": "chase_ur",
    "name": "Chase Ultimate Rewards",
    "type": "credit_card",
    "baselineCpp": 1.5,
    "transferPartners": [
      {
        "slug": "aeroplan",
        "name": "Air Canada Aeroplan",
        "type": "airline",
        "ratio": 1.0,
        "transferTimeDays": 0,
        "bonusPercent": 0,
        "minimumTransfer": 1000,
        "isActive": true
      }
    ]
  }
}
```

---

### `POST /api/chat`

Stream an LLM advisor response over SSE.

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "What's the best way to fly business to Tokyo with 100k Chase points?" }
  ],
  "context": {
    "balances": {
      "chase_ur": 100000,
      "amex_mr": 45000
    },
    "recentSearch": { "origin": "JFK", "destination": "NRT", "date": "2024-11-15" }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `messages` | `{role, content}[]` | yes | Conversation history (last N turns) |
| `context.balances` | `Record<string, number>` | no | User's current point balances |
| `context.recentSearch` | object | no | Pre-populate search context |

**Response:** `Content-Type: text/event-stream`

Events follow the Vercel AI SDK format so `useChat` works without a custom parser:

```
data: 0:"Here is what I found for JFK to NRT..."

data: 0:" Aeroplan is your best option"

data: d:{"finishReason":"stop","usage":{"promptTokens":412,"completionTokens":318}}

data: [DONE]
```

---

### `POST /api/users/balances` (planned)

Save or update a user's point balances.

**Request body:**
```json
{
  "balances": {
    "chase_ur": 100000,
    "amex_mr": 45000,
    "aeroplan": 0
  }
}
```

---

## Rate Limits

| Route | Limit |
|---|---|
| `POST /api/search` | 20 req/min per IP |
| `POST /api/chat` | 10 req/min per IP |
| `GET /api/*` | 120 req/min per IP |

Rate limit headers are returned on every response:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 17
X-RateLimit-Reset: 1727870460
```

---

## Authentication (Planned)

Initially the app is unauthenticated — anyone can search. User accounts (for
saving balances, search history) will use JWT bearer tokens:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens are issued at `POST /api/auth/login` and refreshed at `POST /api/auth/refresh`.

---

## CORS

In development, CORS is open. In production, allowed origins are set via the
`ALLOWED_ORIGINS` environment variable (comma-separated list).
