import { z } from "zod";

const optionalText = z.string().trim().max(300).optional().or(z.literal(""));
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,24}$/, "Enter a valid phone number").optional().or(z.literal(""));
const email = z.email().max(255).optional().or(z.literal(""));

export const ownerCreateSchema = z.discriminatedUnion("ownerType", [
  z.object({
    ownerType: z.literal("PERSON"),
    fullName: z.string().trim().min(2).max(150),
    identityNumber: z.string().trim().min(3).max(80),
    phone,
    email,
    address: optionalText,
  }).strict(),
  z.object({
    ownerType: z.literal("COMPANY"),
    companyName: z.string().trim().min(2).max(200),
    registrationNumber: z.string().trim().min(3).max(80),
    phone,
    email,
    address: optionalText,
  }).strict(),
]);

export const ownerListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "newest"]).default("name"),
});

export const ownerIdSchema = z.object({ id: z.coerce.number().int().positive() });
