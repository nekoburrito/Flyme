import { z } from 'zod';

export const cabinClassSchema = z.enum(['economy', 'premium_economy', 'business', 'first']);

export const searchParamsSchema = z.object({
  origin: z.string().length(3).toUpperCase(),
  destination: z.string().length(3).toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Return date must be YYYY-MM-DD')
    .optional(),
  cabin: cabinClassSchema,
  passengers: z.number().int().min(1).max(9).default(1),
  programs: z.array(z.string()).optional(),
});

export type SearchParamsInput = z.input<typeof searchParamsSchema>;
export type SearchParamsOutput = z.output<typeof searchParamsSchema>;

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  context: z
    .object({
      balances: z.record(z.string(), z.number().int().nonnegative()).optional(),
      recentSearch: searchParamsSchema.optional(),
    })
    .optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const transferQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.coerce.number().int().positive(),
});

export type TransferQuery = z.infer<typeof transferQuerySchema>;
