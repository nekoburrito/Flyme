import { type Router, Router as createRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { transferGraphService } from '../services/rewards/transfer-graph.service.js';

export const transfersRouter: Router = createRouter();

const pathsQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  maxHops: z.coerce.number().int().min(1).max(4).optional(),
});

function parseQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new AppError('INVALID_QUERY', result.error.issues[0]?.message ?? 'Invalid query', 400, result.error.issues);
  }
  return result.data;
}

// GET /api/transfers?from=<slug>&to=<slug>&amount=<n>&maxHops=<n>
transfersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(pathsQuerySchema, req.query);
    const result = transferGraphService.findPaths(query.from, query.to, query.amount, query.maxHops);
    if (result.isErr()) throw result.error;
    res.json({ paths: result.value });
  }),
);
