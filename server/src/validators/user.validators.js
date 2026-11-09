import { z } from "zod";

export const userIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const userStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const userCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.email().max(255),
  phone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,24}$/, "Enter a valid phone number").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "REGISTRAR", "SURVEYOR", "CLERK"]),
  password: z.string().min(8).max(72),
}).strict();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
