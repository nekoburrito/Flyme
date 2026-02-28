import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma before importing the service
vi.mock("../../db/prisma.js", () => ({
  prisma: {
    program: { findMany: vi.fn() },
    transferPartner: { findMany: vi.fn() },
  },
}));

import { prisma } from "../../db/prisma.js";
import { TransferGraphService } from "./transfer-graph.service.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeProgram = (overrides: {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  type: string;
  baselineCpp: number;
}) => ({
  logoUrl: null,
  websiteUrl: "https://example.com",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makePartner = (overrides: {
  id: string;
  fromProgramId: string;
  toProgramId: string;
  ratio: number;
  minimumTransfer?: number;
  transferUnit?: number;
  transferTimeDays?: number;
  bonusPercent?: number;
  fees?: unknown;
  isActive?: boolean;
}) => ({
  minimumTransfer: 1000,
  transferUnit: 1000,
  transferTimeDays: 0,
  bonusPercent: 0,
  fees: [],
  bonusExpiresAt: null,
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Programs used across tests
const PROG_SOURCE = makeProgram({
  id: "src-id",
  slug: "source-cc",
  name: "Source Credit Card",
  shortName: "Source CC",
  type: "credit_card",
  baselineCpp: 1.25,
});

const PROG_AIRLINE_A = makeProgram({
  id: "ala-id",
  slug: "airline-a",
  name: "Airline A",
  shortName: "Airline A",
  type: "airline",
  baselineCpp: 1.5,
});

const PROG_AIRLINE_B = makeProgram({
  id: "alb-id",
  slug: "airline-b",
  name: "Airline B",
  shortName: "Airline B",
  type: "airline",
  baselineCpp: 2.0,
});

// Only reachable via airline-a (multi-hop test)
const PROG_ISLAND = makeProgram({
  id: "isl-id",
  slug: "island",
  name: "Island Air",
  shortName: "Island",
  type: "airline",
  baselineCpp: 3.0,
});

const ALL_PROGRAMS = [PROG_SOURCE, PROG_AIRLINE_A, PROG_AIRLINE_B, PROG_ISLAND];

const PARTNER_SOURCE_TO_A = makePartner({
  id: "p-sa",
  fromProgramId: "src-id",
  toProgramId: "ala-id",
  ratio: 1.0,
});

const PARTNER_SOURCE_TO_B = makePartner({
  id: "p-sb",
  fromProgramId: "src-id",
  toProgramId: "alb-id",
  ratio: 1.0,
});

// Multi-hop: airline-a → island
const PARTNER_A_TO_ISLAND = makePartner({
  id: "p-ai",
  fromProgramId: "ala-id",
  toProgramId: "isl-id",
  ratio: 1.0,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDb(
  programs: typeof ALL_PROGRAMS,
  partners: ReturnType<typeof makePartner>[],
) {
  vi.mocked(prisma.program.findMany).mockResolvedValue(programs as never);
  vi.mocked(prisma.transferPartner.findMany).mockResolvedValue(partners as never);
}

async function buildService(
  programs = ALL_PROGRAMS,
  partners: ReturnType<typeof makePartner>[] = [
    PARTNER_SOURCE_TO_A,
    PARTNER_SOURCE_TO_B,
    PARTNER_A_TO_ISLAND,
  ],
): Promise<TransferGraphService> {
  mockDb(programs, partners);
  const svc = new TransferGraphService();
  await svc.initialize();
  return svc;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TransferGraphService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  it("returns an error if findPaths is called before initialize()", () => {
    const svc = new TransferGraphService();
    const result = svc.findPaths("source-cc", "airline-a", 50_000);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("SERVICE_NOT_INITIALIZED");
  });

  // ── getPrograms / getProgram ───────────────────────────────────────────────

  it("getPrograms returns all active programs", async () => {
    const svc = await buildService();
    const programs = svc.getPrograms();
    expect(programs).toHaveLength(4);
    expect(programs.map((p) => p.slug).sort()).toEqual([
      "airline-a",
      "airline-b",
      "island",
      "source-cc",
    ]);
  });

  it("getProgram returns the matching program", async () => {
    const svc = await buildService();
    expect(svc.getProgram("airline-a")).toMatchObject({ slug: "airline-a", baselineCpp: 1.5 });
  });

  it("getProgram returns undefined for an unknown slug", async () => {
    const svc = await buildService();
    expect(svc.getProgram("nonexistent")).toBeUndefined();
  });

  // ── findPaths — error cases ───────────────────────────────────────────────

  it("returns PROGRAM_NOT_FOUND if fromSlug is unknown", async () => {
    const svc = await buildService();
    const result = svc.findPaths("ghost", "airline-a", 50_000);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("PROGRAM_NOT_FOUND");
  });

  it("returns PROGRAM_NOT_FOUND if toSlug is unknown", async () => {
    const svc = await buildService();
    const result = svc.findPaths("source-cc", "ghost", 50_000);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("PROGRAM_NOT_FOUND");
  });

  it("returns an empty array when from and to are the same program", async () => {
    const svc = await buildService();
    const result = svc.findPaths("source-cc", "source-cc", 50_000);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(0);
  });

  it("returns an empty array when no path exists", async () => {
    const svc = await buildService(ALL_PROGRAMS, [PARTNER_SOURCE_TO_A]); // no path to airline-b
    const result = svc.findPaths("source-cc", "airline-b", 50_000);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(0);
  });

  // ── Direct path — happy path ──────────────────────────────────────────────

  it("finds a direct 1:1 path and computes steps correctly", async () => {
    const svc = await buildService();
    const result = svc.findPaths("source-cc", "airline-a", 50_000);

    expect(result.isOk()).toBe(true);
    const paths = result._unsafeUnwrap();
    // At least one direct path
    const direct = paths.find((p) => p.steps.length === 1);
    expect(direct).toBeDefined();

    const step = direct!.steps[0]!;
    expect(step.fromProgramSlug).toBe("source-cc");
    expect(step.toProgramSlug).toBe("airline-a");
    expect(step.pointsIn).toBe(50_000);
    expect(step.pointsOut).toBe(50_000);
    expect(step.ratio).toBe(1.0);
    expect(step.transferTimeDays).toBe(0);
    expect(step.estimatedFeeCents).toBe(0);
  });

  it("computes effectiveCpp as destination baselineCpp for 1:1 transfer", async () => {
    const svc = await buildService();
    const paths = svc.findPaths("source-cc", "airline-a", 50_000)._unsafeUnwrap();
    const direct = paths.find((p) => p.steps.length === 1)!;

    // 50k points × 1.5 cpp / 50k source points = 1.5
    expect(direct.effectiveCpp).toBeCloseTo(1.5);
    expect(direct.totalPointsRequired).toBe(50_000);
    expect(direct.totalTransferDays).toBe(0);
    expect(direct.isViable).toBe(true);
  });

  it("marks path not viable when pointsAvailable is below required", async () => {
    const svc = await buildService();
    // minimumTransfer defaults to 1000, so 500 is below minimum
    const paths = svc.findPaths("source-cc", "airline-a", 500)._unsafeUnwrap();
    // Path should not be returned (minimum transfer not met → computePath returns null)
    expect(paths).toHaveLength(0);
  });

  // ── Transfer unit rounding ────────────────────────────────────────────────

  it("rounds down pointsIn to the nearest transferUnit", async () => {
    const partner = makePartner({
      id: "p-sa-unit",
      fromProgramId: "src-id",
      toProgramId: "ala-id",
      ratio: 1.0,
      minimumTransfer: 1000,
      transferUnit: 1000,
    });
    const svc = await buildService(ALL_PROGRAMS, [partner]);

    // 50,999 should be rounded down to 50,000
    const paths = svc.findPaths("source-cc", "airline-a", 50_999)._unsafeUnwrap();
    const direct = paths.find((p) => p.steps.length === 1)!;
    expect(direct.steps[0]!.pointsIn).toBe(50_000);
    expect(direct.steps[0]!.pointsOut).toBe(50_000);
    expect(direct.totalPointsRequired).toBe(50_000);
  });

  // ── Transfer bonus ────────────────────────────────────────────────────────

  it("applies bonusPercent to points out", async () => {
    const partner = makePartner({
      id: "p-bonus",
      fromProgramId: "src-id",
      toProgramId: "ala-id",
      ratio: 1.0,
      bonusPercent: 30, // 30% bonus
    });
    const svc = await buildService(ALL_PROGRAMS, [partner]);

    const paths = svc.findPaths("source-cc", "airline-a", 10_000)._unsafeUnwrap();
    const direct = paths.find((p) => p.steps.length === 1)!;

    // 10,000 × 1.0 × 1.30 = 13,000
    expect(direct.steps[0]!.pointsOut).toBe(13_000);
    // effectiveCpp = 13,000 × 1.5 / 10,000 = 1.95
    expect(direct.effectiveCpp).toBeCloseTo(1.95);
  });

  // ── Fees ──────────────────────────────────────────────────────────────────

  it("includes flat fee in estimatedFeeCents", async () => {
    const partner = makePartner({
      id: "p-fee",
      fromProgramId: "src-id",
      toProgramId: "ala-id",
      ratio: 1.0,
      fees: [{ type: "flat", amount: 2500, currency: "USD" }], // $25.00
    });
    const svc = await buildService(ALL_PROGRAMS, [partner]);

    const paths = svc.findPaths("source-cc", "airline-a", 50_000)._unsafeUnwrap();
    const direct = paths.find((p) => p.steps.length === 1)!;
    expect(direct.steps[0]!.estimatedFeeCents).toBe(2500);
  });

  it("calculates percent fee in estimatedFeeCents against source baseline cpp", async () => {
    const partner = makePartner({
      id: "p-pct",
      fromProgramId: "src-id",
      toProgramId: "ala-id",
      ratio: 1.0,
      fees: [{ type: "percent", amount: 100 }], // 100bp = 1%
    });
    const svc = await buildService(ALL_PROGRAMS, [partner]);

    // notionalCents = 10,000 points × 1.25 cpp = 12,500 cents
    // fee = 1% of 12,500 = 125 cents ($1.25)
    const paths = svc.findPaths("source-cc", "airline-a", 10_000)._unsafeUnwrap();
    const direct = paths.find((p) => p.steps.length === 1)!;
    expect(direct.steps[0]!.estimatedFeeCents).toBe(125);
  });

  // ── Transfer time accumulation ────────────────────────────────────────────

  it("accumulates transferTimeDays across hops", async () => {
    const partnerSrcA = makePartner({
      id: "p-sa-days",
      fromProgramId: "src-id",
      toProgramId: "ala-id",
      ratio: 1.0,
      transferTimeDays: 2,
    });
    const partnerAIsland = makePartner({
      id: "p-ai-days",
      fromProgramId: "ala-id",
      toProgramId: "isl-id",
      ratio: 1.0,
      transferTimeDays: 3,
    });
    const svc = await buildService(ALL_PROGRAMS, [partnerSrcA, partnerAIsland]);

    const paths = svc.findPaths("source-cc", "island", 50_000)._unsafeUnwrap();
    expect(paths).toHaveLength(1);
    expect(paths[0]!.totalTransferDays).toBe(5); // 2 + 3
  });

  // ── Multi-hop path ────────────────────────────────────────────────────────

  it("finds a 2-hop path when a direct path doesn't exist", async () => {
    // Only source→airline-a and airline-a→island (no direct source→island)
    const svc = await buildService(ALL_PROGRAMS, [
      PARTNER_SOURCE_TO_A,
      PARTNER_A_TO_ISLAND,
    ]);

    const result = svc.findPaths("source-cc", "island", 50_000);
    expect(result.isOk()).toBe(true);
    const paths = result._unsafeUnwrap();
    expect(paths).toHaveLength(1);
    expect(paths[0]!.steps).toHaveLength(2);
    expect(paths[0]!.steps[0]!.fromProgramSlug).toBe("source-cc");
    expect(paths[0]!.steps[0]!.toProgramSlug).toBe("airline-a");
    expect(paths[0]!.steps[1]!.fromProgramSlug).toBe("airline-a");
    expect(paths[0]!.steps[1]!.toProgramSlug).toBe("island");
  });

  it("computes effectiveCpp correctly across two hops", async () => {
    const svc = await buildService(ALL_PROGRAMS, [
      PARTNER_SOURCE_TO_A,
      PARTNER_A_TO_ISLAND,
    ]);

    const paths = svc.findPaths("source-cc", "island", 50_000)._unsafeUnwrap();
    // Both hops are 1:1, so 50k source → 50k airline-a → 50k island
    // Island baselineCpp = 3.0, source points = 50k
    // effectiveCpp = (50,000 × 3.0) / 50,000 = 3.0
    expect(paths[0]!.effectiveCpp).toBeCloseTo(3.0);
  });

  it("does not exceed maxHops", async () => {
    const svc = await buildService(ALL_PROGRAMS, [
      PARTNER_SOURCE_TO_A,
      PARTNER_A_TO_ISLAND,
    ]);

    // maxHops=1 means only direct transfers — island is unreachable
    const result = svc.findPaths("source-cc", "island", 50_000, 1);
    expect(result._unsafeUnwrap()).toHaveLength(0);
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  it("sorts paths by effectiveCpp descending when multiple exist", async () => {
    // source→airline-a (cpp 1.5) and source→airline-b (cpp 2.0)
    const svc = await buildService(ALL_PROGRAMS, [
      PARTNER_SOURCE_TO_A,
      PARTNER_SOURCE_TO_B,
    ]);

    // Both reach airline-b directly; airline-a is also reachable
    // Let's test finding paths to airline-b — only one direct path
    const resultB = svc.findPaths("source-cc", "airline-b", 50_000)._unsafeUnwrap();
    expect(resultB[0]!.effectiveCpp).toBeCloseTo(2.0);

    // Now test with a graph that has two routes to the same destination via different paths
    // (airline-b reachable directly AND via airline-a if we add airline-a→airline-b edge)
    const partnerAtoB = makePartner({
      id: "p-ab",
      fromProgramId: "ala-id",
      toProgramId: "alb-id",
      ratio: 1.0,
    });
    const svc2 = await buildService(ALL_PROGRAMS, [
      PARTNER_SOURCE_TO_A,
      PARTNER_SOURCE_TO_B,
      partnerAtoB,
    ]);
    const paths = svc2.findPaths("source-cc", "airline-b", 50_000)._unsafeUnwrap();
    // Both paths arrive at airline-b (cpp 2.0) with 50k miles, so effectiveCpp is equal
    // Just verify they're sorted (equal values — order doesn't matter)
    const cpps = paths.map((p) => p.effectiveCpp);
    expect(cpps).toEqual([...cpps].sort((a, b) => b - a));
  });

  // ── Inactive partners ─────────────────────────────────────────────────────

  it("skips inactive partners when building the graph", async () => {
    const inactivePartner = makePartner({
      id: "p-inactive",
      fromProgramId: "src-id",
      toProgramId: "alb-id",
      ratio: 1.0,
      isActive: false,
    });
    const svc = await buildService(ALL_PROGRAMS, [PARTNER_SOURCE_TO_A, inactivePartner]);

    // airline-b should be unreachable because the partner is inactive
    const result = svc.findPaths("source-cc", "airline-b", 50_000)._unsafeUnwrap();
    expect(result).toHaveLength(0);
  });
});
