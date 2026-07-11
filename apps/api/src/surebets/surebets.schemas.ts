import { z } from "zod";
import { OPPORTUNITY_STATUSES } from "@rataria/shared";

export const listSurebetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  sport: z.string().min(1).optional(),
  minProfit: z.coerce.number().min(0).optional(),
  minConfidence: z.coerce.number().int().min(0).max(100).optional(),
  onlyViable: z.coerce.boolean().optional(),
});

export type ListSurebetsQuery = z.infer<typeof listSurebetsQuerySchema>;

const decimalString = z.string().regex(/^\d+(\.\d+)?$/, "valor decimal inválido");

export const simulateBodySchema = z.object({
  totalStake: decimalString,
  stakeIncrement: decimalString.optional(),
  minStakePerLeg: decimalString.optional(),
  maxStakePerLeg: decimalString.optional(),
  minWorstProfit: decimalString.optional(),
});

export type SimulateBody = z.infer<typeof simulateBodySchema>;
