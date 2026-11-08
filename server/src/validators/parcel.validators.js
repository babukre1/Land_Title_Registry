import { z } from "zod";

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const polygon = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(coordinate).min(4).max(101)).length(1),
}).strict();
const ownership = z.array(z.object({ ownerId: z.coerce.number().int().positive(), sharePercent: z.coerce.number().positive().max(100) }).strict()).min(1).max(20);

export const parcelProposalSchema = z.object({
  districtId: z.coerce.number().int().positive(),
  areaName: z.string().trim().min(2).max(150),
  landUse: z.enum(["RESIDENTIAL", "COMMERCIAL", "FARM"]),
  geometry: polygon,
  owners: ownership,
  confirmUnusualArea: z.boolean().default(false),
  idempotencyKey: z.uuid().optional(),
}).strict();

export const parcelRegistrationSchema = parcelProposalSchema.extend({ idempotencyKey: z.uuid() });
export const parcelCorrectionSchema = parcelProposalSchema.omit({ idempotencyKey: true, confirmUnusualArea: true }).extend({ confirmUnusualArea: z.boolean().default(false) });
export const parcelIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const parcelListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  districtId: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING_SURVEY", "VERIFIED", "REGISTERED", "RETURNED_FOR_CORRECTION", "DISPUTED"]).optional(),
  landUse: z.enum(["RESIDENTIAL", "COMMERCIAL", "FARM"]).optional(),
  ownerName: z.string().trim().max(150).optional(),
  ownerQuery: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
