import { z } from "zod";

export const ProcessPayrollSchema = z.object({
  period: z.string().min(1),
  runAt: z.string().optional(),
});
export type ProcessPayrollDto = z.infer<typeof ProcessPayrollSchema>;

export const PayrollSummaryQuery = z.object({
  period: z.string().min(1),
});
export type PayrollSummaryQueryDto = z.infer<typeof PayrollSummaryQuery>;