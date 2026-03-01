# Rewards Data Model — Flyme

This document describes the domain model for loyalty programs, transfer partners,
award options, and related concepts. It is the reference for data structures in
`packages/shared/src/types/` and the Prisma schema.

---

## Core Concepts

### Loyalty Program

A **loyalty program** is any points/miles currency that Flyme tracks. There are
three subtypes:

| Type | Examples |
|---|---|
| `credit_card` | Chase Ultimate Rewards, Amex Membership Rewards, Citi ThankYou, Capital One Miles, Bilt Rewards, Wells Fargo Autograph |
| `airline` | Air Canada Aeroplan, United MileagePlus, Delta SkyMiles, American AAdvantage, British Airways Avios, Singapore KrisFlyer, ANA Mileage Club |
| `hotel` | Hyatt World of Hyatt, Marriott Bonvoy, Hilton Honors, IHG One Rewards |

Credit card programs are the **sources** (the user holds points here); airline and
hotel programs are typically the **destinations** (where points are transferred to
book awards). Some airline programs (Avios, Flying Blue) transfer to other airlines
too, creating multi-hop paths.

```typescript
type ProgramType = 'credit_card' | 'airline' | 'hotel';

interface LoyaltyProgram {
  slug: string;                // e.g. "chase_ur", "aeroplan", "world_of_hyatt"
  name: string;                // e.g. "Chase Ultimate Rewards"
  shortName: string;           // e.g. "Chase UR"
  type: ProgramType;
  logoUrl: string;
  baselineCpp: number;         // Community valuation in cents per point
  websiteUrl: string;
  transferPartners: TransferPartner[];
}
```

---

### Transfer Partner

A **transfer partner** defines a one-directional relationship: you can move points
from `fromProgram` to `toProgram` at a given ratio.

```typescript
interface TransferPartner {
  fromProgramSlug: string;   // e.g. "chase_ur"
  toProgramSlug: string;     // e.g. "aeroplan"
  ratio: number;             // Points out per point in. 1.0 = 1:1, 0.5 = 2:1
  minimumTransfer: number;   // e.g. 1000
  transferUnit: number;      // Transfers must be in multiples of this. e.g. 1000
  transferTimeDays: number;  // 0 = instant, 3 = 3 business days
  bonusPercent: number;      // Current transfer bonus, 0 if none
  bonusExpiresAt?: string;   // ISO 8601, if a limited-time bonus is active
  fees: TransferFee[];
  isActive: boolean;
  notes?: string;            // Human-readable caveats
}

interface TransferFee {
  type: 'flat' | 'percent';
  amount: number;            // Cents (flat) or basis points * 100 (percent)
  currency?: string;         // If flat, the currency (usually "USD")
}
```

**Key transfer partner data (initial seed):**

| From | To | Ratio | Transfer Time |
|---|---|---|---|
| Chase UR | Aeroplan | 1:1 | Instant |
| Chase UR | United | 1:1 | Instant |
| Chase UR | Hyatt | 1:1 | Instant |
| Chase UR | British Airways | 1:1 | Instant |
| Chase UR | Singapore | 1:1 | 1–2 days |
| Chase UR | ANA | 1:1 | 2 days |
| Amex MR | Aeroplan | 1:1 | Instant |
| Amex MR | Delta | 1:1 | Instant |
| Amex MR | ANA | 1:1 | 2–3 days |
| Amex MR | British Airways | 1:1 | Instant |
| Amex MR | Singapore | 1:1 | 1 day |
| Citi TYP | Avianca LifeMiles | 1:1 | 1–3 days |
| Citi TYP | Turkish Miles&Smiles | 1:1 | 1–3 days |
| Capital One | Avianca LifeMiles | 1:1 | Instant |
| Capital One | Turkish Miles&Smiles | 1:1 | Instant |
| Bilt | Aeroplan | 1:1 | Instant |
| Bilt | Hyatt | 1:1 | Instant |
| Bilt | United | 1:1 | Instant |

> This table is seeded into the database. Maintain the Prisma seed file as the
> canonical source. Do not hard-code ratios in application logic.

---

### Transfer Path

A **transfer path** is one or more steps to get points from a credit card program
to an airline program where the award can be booked. Paths can be:

- **Direct**: Chase UR → Aeroplan (1 step)
- **Multi-hop**: Amex MR → Avianca → award on Star Alliance (2 steps — less common,
  but some programs allow this)

```typescript
interface TransferStep {
  fromProgramSlug: string;
  toProgramSlug: string;
  fromProgram: LoyaltyProgram;    // Populated on read
  toProgram: LoyaltyProgram;
  ratio: number;
  pointsIn: number;
  pointsOut: number;
  transferTimeDays: number;
  bonusPercent: number;
  estimatedFeeCents: number;
}

interface TransferPath {
  steps: TransferStep[];
  totalPointsRequired: number;    // In the source (credit card) currency
  totalTransferDays: number;      // Sum of all steps (worst-case)
  effectiveCpp: number;           // How much is the award worth relative to points spent
  isViable: boolean;              // User has enough balance, all partners active
}
```

---

### Award Option

An **award option** is a specific bookable flight (or set of flights) available
through a particular loyalty program.

```typescript
type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

interface AwardSegment {
  flightNumber: string;        // e.g. "NH007"
  carrier: string;             // Operating carrier IATA code
  origin: string;
  destination: string;
  departureAt: string;         // ISO 8601 with timezone
  arrivalAt: string;
  durationMinutes: number;
  aircraft?: string;           // e.g. "Boeing 777-300ER"
}

interface AwardOption {
  id: string;
  program: string;             // Booking program slug (e.g., "aeroplan")
  programDisplayName: string;
  segments: AwardSegment[];
  cabin: CabinClass;
  milesRequired: number;
  taxesCents: number;          // Cash co-pay (fuel surcharges, etc.)
  seatsAvailable: number;      // -1 if count unavailable
  centsPerPoint: number;       // Calculated: cashPriceCents / milesRequired
  cashPriceCents: number;      // Comparable cash fare for CPP calculation
  source: 'seats_aero' | 'amadeus' | 'manual';
  fetchedAt: string;           // ISO 8601
  bookingUrl?: string;         // Deep link to program's booking page
  transferPaths?: TransferPath[];  // Populated when user context is available
}
```

---

### Points Balance

A user's current balance in each program.

```typescript
interface PointsBalance {
  programSlug: string;
  balance: number;
  lastUpdatedAt: string;
  isManual: boolean;  // true = user entered it; false = pulled via API (future)
}
```

---

### Cents Per Point (CPP)

CPP is the primary value metric. It answers: "For every point I spend, how many
cents of value do I get?"

```
cpp = cashPriceCents / milesRequired
```

**Community benchmark CPP values (approximate):**

| Program | Conservative | Aspirational |
|---|---|---|
| Chase UR (travel portal) | 1.25¢ | 2.0¢+ (via partners) |
| Amex MR | 1.0¢ | 2.0¢+ (via partners) |
| Aeroplan | 1.3¢ | 2.0¢+ (business) |
| United MileagePlus | 1.1¢ | 1.9¢ |
| ANA Mileage Club | 1.4¢ | 4.0¢+ (first class) |
| Singapore KrisFlyer | 1.3¢ | 3.5¢+ (Suites) |
| Avios (BA/IB/AA) | 1.3¢ | 2.5¢+ (short-haul) |
| World of Hyatt | 1.7¢ | 2.5¢+ |
| Marriott Bonvoy | 0.7¢ | 1.1¢ |

Store these in the `LoyaltyProgram.baselineCpp` field. The LLM advisor uses these
as a floor — if an option is below baseline CPP, it calls that out.

---

### Program Rules (Qualitative)

Beyond numbers, programs have rules that affect booking strategy. These are stored
as structured data in `ProgramRule` records and referenced by the `lookup_program_rules`
LLM tool.

```typescript
type RuleTopic =
  | 'stopover'
  | 'open_jaw'
  | 'fuel_surcharges'
  | 'partner_awards'
  | 'mixed_cabin'
  | 'routing_rules'
  | 'award_expiry'
  | 'cancellation';

interface ProgramRule {
  programSlug: string;
  topic: RuleTopic;
  summary: string;    // 1–3 sentence plain-English summary for LLM context
  detail: string;     // Full detail, may include examples
  isNegative: boolean; // true = this is a gotcha/downside
  lastVerifiedAt: string;
  sourceUrl?: string;
}
```

**Example rules to seed:**

| Program | Topic | Summary |
|---|---|---|
| Aeroplan | stopover | Aeroplan allows one free stopover on one-way international awards. |
| Aeroplan | fuel_surcharges | Aeroplan does not pass on fuel surcharges for most partner airlines, including Lufthansa and Swiss. |
| Aeroplan | open_jaw | Aeroplan allows open-jaw routing on international awards at no extra cost. |
| ANA | partner_awards | ANA allows round-the-world awards on Star Alliance partners starting at 55,000 miles. |
| British Airways | fuel_surcharges | Avios charges significant fuel surcharges on BA-operated long-haul, but not on partner short-haul. |
| United | stopover | United does not allow stopovers on award tickets. |
| Turkish | partner_awards | Turkish Miles&Smiles has low rates for Star Alliance partners: 45k miles in business to the US. |

---

## Transfer Partner Graph

The transfer graph is a directed weighted graph:

- **Nodes**: every `LoyaltyProgram`
- **Edges**: every `TransferPartner` (directional)
- **Weight**: `1 / ratio` (so higher-ratio transfers have lower cost)

The `TransferGraphService` loads this from the database on startup, builds an
in-memory adjacency list, and runs BFS or Dijkstra to find transfer paths.

For CPP-aware ranking, the edge weight becomes:
```
weight = (1 / ratio) * (1 + bonusPercent / 100)
```
(A 30% transfer bonus effectively increases the ratio, making the path cheaper.)

---

## Seeding the Database

The seed file at `packages/server/prisma/seed.ts` populates:
1. All `LoyaltyProgram` records
2. All `TransferPartner` edges
3. All `ProgramRule` records
4. Baseline CPP values

Run the seed: `pnpm --filter server db:seed`

The seed file is the **single source of truth** for partner data. Do not hard-code
partner relationships in service or tool code. Always read from the DB (or cache).
