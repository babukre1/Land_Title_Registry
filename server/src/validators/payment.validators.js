import { z } from "zod";

export const paymentSchema = z.object({
  paymentMethod: z.enum(["EVC_PLUS", "ZAAD", "EDAHAB"]),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/, "Enter a valid demonstration mobile number"),
}).strict();

export const feeSettingSchema = z.object({
  percentageRate: z.coerce.number().positive().max(100),
  minimumFee: z.coerce.number().nonnegative().max(9999999999.99),
}).strict();
