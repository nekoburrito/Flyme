import { type Router, Router as createRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { transferGraphService } from '../services/rewards/transfer-graph.service.js';

export const programsRouter: Router = createRouter();

const listQuerySchema = z.object({
  type: z.enum(['credit_card', 'airline', 'hotel']).optional(),
});

function parseQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new AppError('INVALID_QUERY', result.error.issues[0]?.message ?? 'Invalid query', 400, result.error.issues);
  }
  return result.data;
}

// GET /api/programs?type=credit_card|airline|hotel
programsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(listQuerySchema, req.query);
    let programs = transferGraphService.getPrograms();
    if (query.type) programs = programs.filter((p) => p.type === query.type);
    res.json({ programs });
  }),
);

// GET /api/programs/:slug
programsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    // Express 5 types params as string | string[]; named route params are always string
    const slug = req.params['slug'] as string;
    const program = transferGraphService.getProgram(slug);
    if (!program) {
      throw new AppError('PROGRAM_NOT_FOUND', `Program "${slug}" not found`, 404);
    }
    res.json(program);
  }),
);
