import { z } from "zod";

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

export const listEventMatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  decision: z
    .enum([
      "AUTO_APPROVED",
      "REVIEW_REQUIRED",
      "REJECTED",
      "MANUALLY_APPROVED",
      "MANUALLY_REJECTED",
      "SUPERSEDED",
    ])
    .optional(),
  providerKey: z.string().min(1).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
});
export type ListEventMatchesQuery = z.infer<typeof listEventMatchesQuerySchema>;

export const reviewDecisionBodySchema = z.object({
  note: z.string().max(500).optional(),
  decidedBy: z.string().min(1).max(120).default("dev-reviewer"),
});
export type ReviewDecisionBody = z.infer<typeof reviewDecisionBodySchema>;
