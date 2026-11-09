import { z } from "zod";

export const disputeListSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const disputeIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const disputeDocumentSchema = z.object({ id: z.coerce.number().int().positive(), documentId: z.coerce.number().int().positive() });
export const openDisputeSchema = z.object({ description: z.string().trim().min(10).max(3000), parcelIds: z.array(z.coerce.number().int().positive()).min(1).max(20).transform((ids) => [...new Set(ids)]) }).strict();
export const resolveDisputeSchema = z.object({
  resolution: z.string().trim().min(10).max(4000),
  boundaryChangeParcelIds: z.array(z.coerce.number().int().positive()).max(1).default([]).transform((ids) => [...new Set(ids)]),
}).strict();
