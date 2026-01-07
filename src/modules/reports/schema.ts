import { z } from "zod";

export const DateRangeSchema = z.object({
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid startDate" }),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid endDate" }),
});
export type DateRangeDto = z.infer<typeof DateRangeSchema>;

export const PayrollPeriodSchema = z.object({ period: z.string().min(1) });
export type PayrollPeriodDto = z.infer<typeof PayrollPeriodSchema>;