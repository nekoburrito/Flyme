/**
 * TransferGraphService
 *
 * Loads loyalty programs and transfer partner edges from the database, builds
 * an in-memory directed weighted graph, and finds all transfer paths between a
 * source program and a target program using depth-first search.
 *
 * Usage:
 *   await transferGraphService.initialize();      // once at startup
 *   const result = transferGraphService.findPaths('chase-ur', 'aeroplan', 75_000);
 */

import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";

import type {
  LoyaltyProgram,
  TransferFee,
  TransferPath,
  TransferStep,
} from "@flyme/shared";

import { AppError } from "../../middleware/errorHandler.js";
import { prisma } from "../../db/prisma.js";

// ---------------------------------------------------------------------------
// Internal graph types (richer than the shared TransferPartner — includes IDs)
// ---------------------------------------------------------------------------

type Edge = {
  toProgramSlug: string;
  ratio: number;
  minimumTransfer: number;
  transferUnit: number;
  transferTimeDays: number;
  bonusPercent: number;
  fees: TransferFee[];
  isActive: boolean;
};

// slug → outbound edges
type AdjacencyList = Map<string, Edge[]>;

// ---------------------------------------------------------------------------
// Fee parsing
// ---------------------------------------------------------------------------

function isTransferFee(v: unknown): v is TransferFee {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    (obj["type"] === "flat" || obj["type"] === "percent") &&
    typeof obj["amount"] === "number"
  );
}

function parseFeesJson(raw: unknown): TransferFee[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isTransferFee);
}

/**
 * Estimate the dollar cost (in cents) of transfer fees for a given transfer.
 *
 * Fee encoding:
 *   flat    — amount is in cents (e.g. 2500 = $25.00)
 *   percent — amount is in basis points (e.g. 100 = 1%)
 *             applied to the notional value of the points being transferred
 *             using the source program's baselineCpp
 */
function estimateFeeCents(
  fees: TransferFee[],
  pointsIn: number,
  sourceBaselineCpp: number,
): number {
  return fees.reduce((total, fee) => {
    if (fee.type === "flat") return total + fee.amount;
    // percent: basis points applied to notional point value
    const notionalCents = pointsIn * sourceBaselineCpp;
    return total + Math.round((fee.amount / 10_000) * notionalCents);
  }, 0);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TransferGraphService {
  private adjacency: AdjacencyList = new Map();
  private programsBySlug: Map<string, LoyaltyProgram> = new Map();
  private initialized = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const [dbPrograms, dbPartners] = await Promise.all([
      prisma.program.findMany({ where: { isActive: true } }),
      prisma.transferPartner.findMany({ where: { isActive: true } }),
    ]);

    // Build slug → LoyaltyProgram map
    this.programsBySlug = new Map(
      dbPrograms.map((p) => [
        p.slug,
        {
          slug: p.slug,
          name: p.name,
          shortName: p.shortName,
          type: p.type as LoyaltyProgram["type"],
          logoUrl: p.logoUrl ?? "",
          baselineCpp: p.baselineCpp,
          websiteUrl: p.websiteUrl,
        },
      ]),
    );

    // Build id → slug lookup to resolve partner references
    const idToSlug = new Map(dbPrograms.map((p) => [p.id, p.slug]));

    // Build adjacency list (guard against inactive records slipping through)
    this.adjacency = new Map();
    for (const partner of dbPartners) {
      if (!partner.isActive) continue;
      const fromSlug = idToSlug.get(partner.fromProgramId);
      const toSlug = idToSlug.get(partner.toProgramId);
      if (!fromSlug || !toSlug) continue;

      if (!this.adjacency.has(fromSlug)) this.adjacency.set(fromSlug, []);
      this.adjacency.get(fromSlug)!.push({
        toProgramSlug: toSlug,
        ratio: partner.ratio,
        minimumTransfer: partner.minimumTransfer,
        transferUnit: partner.transferUnit,
        transferTimeDays: partner.transferTimeDays,
        bonusPercent: partner.bonusPercent,
        fees: parseFeesJson(partner.fees),
        isActive: partner.isActive,
      });
    }

    this.initialized = true;
  }

  /** Reload the graph from the database (e.g. after a data update). */
  async refresh(): Promise<void> {
    await this.initialize();
  }

  // ── Read helpers ──────────────────────────────────────────────────────────

  getPrograms(): LoyaltyProgram[] {
    return Array.from(this.programsBySlug.values());
  }

  getProgram(slug: string): LoyaltyProgram | undefined {
    return this.programsBySlug.get(slug);
  }

  // ── Path finding ──────────────────────────────────────────────────────────

  /**
   * Find all transfer paths from `fromSlug` to `toSlug` using up to `maxHops`
   * transfer steps, given `pointsAvailable` in the source program.
   *
   * Returns paths sorted best-value-first by effectiveCpp.
   *
   * @param fromSlug        Source program slug (e.g. "chase-ur")
   * @param toSlug          Destination program slug (e.g. "aeroplan")
   * @param pointsAvailable Points the user has in the source program
   * @param maxHops         Maximum number of transfer steps (default 2)
   */
  findPaths(
    fromSlug: string,
    toSlug: string,
    pointsAvailable: number,
    maxHops = 2,
  ): Result<TransferPath[], AppError> {
    if (!this.initialized) {
      return err(
        new AppError("SERVICE_NOT_INITIALIZED", "Transfer graph not yet loaded", 503),
      );
    }
    if (!this.programsBySlug.has(fromSlug)) {
      return err(new AppError("PROGRAM_NOT_FOUND", `Program "${fromSlug}" not found`, 404));
    }
    if (!this.programsBySlug.has(toSlug)) {
      return err(new AppError("PROGRAM_NOT_FOUND", `Program "${toSlug}" not found`, 404));
    }
    if (fromSlug === toSlug) {
      return ok([]);
    }

    const paths: TransferPath[] = [];
    this.dfs(fromSlug, toSlug, pointsAvailable, new Set([fromSlug]), [], paths, maxHops);

    // Best value first
    paths.sort((a, b) => b.effectiveCpp - a.effectiveCpp);
    return ok(paths);
  }

  // ── Private: DFS ──────────────────────────────────────────────────────────

  private dfs(
    currentSlug: string,
    targetSlug: string,
    currentPoints: number,
    visited: Set<string>,
    edgePath: Array<{ fromSlug: string; edge: Edge }>,
    results: TransferPath[],
    maxHops: number,
  ): void {
    const edges = this.adjacency.get(currentSlug) ?? [];

    for (const edge of edges) {
      if (visited.has(edge.toProgramSlug)) continue; // no cycles

      const newEdgePath = [...edgePath, { fromSlug: currentSlug, edge }];

      if (edge.toProgramSlug === targetSlug) {
        const path = this.computePath(newEdgePath, currentPoints);
        if (path !== null) results.push(path);
      } else if (newEdgePath.length < maxHops) {
        // Recurse only if we can afford to move through this intermediate node
        const pointsOut = this.computePointsOut(currentPoints, edge);
        if (pointsOut > 0) {
          const nextVisited = new Set(visited).add(edge.toProgramSlug);
          this.dfs(
            edge.toProgramSlug,
            targetSlug,
            pointsOut,
            nextVisited,
            newEdgePath,
            results,
            maxHops,
          );
        }
      }
    }
  }

  // ── Private: Transfer math ────────────────────────────────────────────────

  /**
   * How many points come out of a transfer, accounting for:
   *  - minimum transfer requirement
   *  - rounding down to the nearest transferUnit
   *  - any active bonus percentage
   *
   * Returns 0 if the transfer cannot proceed (e.g. below minimum).
   */
  private computePointsOut(pointsIn: number, edge: Edge): number {
    if (pointsIn < edge.minimumTransfer) return 0;
    const transferable = Math.floor(pointsIn / edge.transferUnit) * edge.transferUnit;
    const multiplier = 1 + edge.bonusPercent / 100;
    return Math.floor(transferable * edge.ratio * multiplier);
  }

  /**
   * Walk an edge path, compute step-by-step transfer math, and return the
   * fully populated TransferPath — or null if the path is not viable
   * (insufficient points at any hop, or a program slug is missing from the graph).
   */
  private computePath(
    edgePath: Array<{ fromSlug: string; edge: Edge }>,
    sourcePoints: number,
  ): TransferPath | null {
    const steps: TransferStep[] = [];
    let currentPoints = sourcePoints;

    for (const { fromSlug, edge } of edgePath) {
      if (currentPoints < edge.minimumTransfer) return null;

      const fromProgram = this.programsBySlug.get(fromSlug);
      if (!fromProgram) return null;

      const transferable = Math.floor(currentPoints / edge.transferUnit) * edge.transferUnit;
      const multiplier = 1 + edge.bonusPercent / 100;
      const pointsOut = Math.floor(transferable * edge.ratio * multiplier);
      if (pointsOut === 0) return null;

      const feeCents = estimateFeeCents(edge.fees, transferable, fromProgram.baselineCpp);

      steps.push({
        fromProgramSlug: fromSlug,
        toProgramSlug: edge.toProgramSlug,
        ratio: edge.ratio,
        pointsIn: transferable,
        pointsOut,
        transferTimeDays: edge.transferTimeDays,
        bonusPercent: edge.bonusPercent,
        estimatedFeeCents: feeCents,
      });

      currentPoints = pointsOut;
    }

    if (steps.length === 0) return null;

    const firstStep = steps[0]!;
    const lastStep = steps[steps.length - 1]!;

    const totalPointsRequired = firstStep.pointsIn;
    const totalTransferDays = steps.reduce((sum, s) => sum + s.transferTimeDays, 0);
    const finalPoints = lastStep.pointsOut;

    const destinationProgram = this.programsBySlug.get(lastStep.toProgramSlug);
    const destBaselineCpp = destinationProgram?.baselineCpp ?? 0;

    // effectiveCpp: cents of destination-program value per source point consumed
    const effectiveCpp =
      totalPointsRequired > 0 ? (finalPoints * destBaselineCpp) / totalPointsRequired : 0;

    const isViable =
      edgePath.every((e) => e.edge.isActive) && sourcePoints >= totalPointsRequired;

    return { steps, totalPointsRequired, totalTransferDays, effectiveCpp, isViable };
  }
}

// Singleton — initialised once at server startup via initialize()
export const transferGraphService = new TransferGraphService();
