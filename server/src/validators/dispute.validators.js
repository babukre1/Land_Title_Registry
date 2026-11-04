import { z } from "zod";

export const disputeListSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const disputeIdSchema = z.object({ id: z.coerce.number().int().positive() });
