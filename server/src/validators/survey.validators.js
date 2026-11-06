import { z } from "zod";

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const polygon = z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(coordinate).min(4).max(101)).length(1) }).strict();

export const surveyIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const surveyListSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "VERIFIED", "CANNOT_VERIFY"]).optional(),
  districtId: z.coerce.number().int().positive().optional(),
  parcelNumber: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const verifySurveySchema = z.object({
  notes: z.string().trim().min(3).max(2000),
  adjustedBoundary: polygon.optional(),
}).strict();
export const cannotVerifySchema = z.object({ reason: z.string().trim().min(5).max(2000) }).strict();
