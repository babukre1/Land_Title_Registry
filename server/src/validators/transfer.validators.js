import { z } from "zod";

export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const transferIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const transferDocumentSchema = z.object({ id: z.coerce.number().int().positive(), documentId: z.coerce.number().int().positive() });
export const transferListSchema = paginationSchema.extend({
  status: z.enum(["AWAITING_OWNER_CONSENT", "AWAITING_BUYER_ACCEPTANCE", "CLERK_REVIEW", "AWAITING_PAYMENT", "REGISTRAR_REVIEW", "APPROVED", "CANCELLED", "REJECTED"]).optional(),
  type: z.enum(["SALE", "INHERITANCE", "GIFT", "COURT_ORDER"]).optional(),
  parcelNumber: z.string().trim().max(40).optional(),
});
export const initiateTransferSchema = z.object({
  parcelId: z.coerce.number().int().positive(), buyerOwnerId: z.coerce.number().int().positive(),
  transferType: z.enum(["SALE", "INHERITANCE", "GIFT", "COURT_ORDER"]), declaredPrice: z.coerce.number().positive().max(999999999999.99),
}).strict();
export const consentSchema = z.object({ decision: z.enum(["CONFIRMED", "DECLINED"]) }).strict();
export const buyerResponseSchema = z.object({ decision: z.enum(["ACCEPTED", "REJECTED"]) }).strict();
export const clerkReviewSchema = z.object({ decision: z.enum(["APPROVED", "RETURNED"]), notes: z.string().trim().min(3).max(2000) }).strict();
export const reasonSchema = z.object({ reason: z.string().trim().min(3).max(1000) }).strict();
export const buyerSearchSchema = z.object({ q: z.string().trim().max(100).default("") });
