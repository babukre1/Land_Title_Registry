import { z } from "zod";

export const certificateIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const parcelCertificateSchema = z.object({ id: z.coerce.number().int().positive() });
export const certificateDownloadSchema = z.object({ lang: z.enum(["en", "so"]).default("en") });
export const verificationTokenSchema = z.object({ token: z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/) });
export const manualVerificationSchema = z.object({
  parcelNumber: z.string().trim().min(5).max(40).regex(/^[A-Z0-9-]+$/),
  certificateNumber: z.string().trim().min(8).max(80).regex(/^[A-Z0-9-]+$/),
});
