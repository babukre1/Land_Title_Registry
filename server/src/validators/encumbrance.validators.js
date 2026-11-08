import { z } from "zod";

export const encumbranceIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const createEncumbranceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MORTGAGE"), bankName: z.string().trim().min(2).max(200), mortgageAmount: z.coerce.number().positive().max(999999999999.99) }).strict(),
  z.object({ type: z.literal("COURT_HOLD"), courtCaseNumber: z.string().trim().min(2).max(100) }).strict(),
]);
export const liftEncumbranceSchema = z.object({ reason: z.string().trim().min(5).max(2000) });
