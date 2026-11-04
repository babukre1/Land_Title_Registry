import { z } from "zod";

export const userIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const userStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
