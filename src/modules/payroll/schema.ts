import { z } from "zod";

export const ProcessPayrollSchema = z.object({
  period: z.string().min(1),
  runAt: z.string().optional(),
});
export type ProcessPayrollDto = z.infer<typeof ProcessPayrollSchema>;

export const PayrollSummaryQuery = z.object({
  // Either provide start & end (ISO date) or period (YYYY-MM)
  start: z.string().optional(),
  end: z.string().optional(),
  period: z.string().optional(),
});
export type PayrollSummaryQueryDto = z.infer<typeof PayrollSummaryQuery>;

export const PayrollExportQuery = z.object({
  period: z.string().min(1),
  format: z.enum(["csv", "pdf"]).default("csv"),
});
export type PayrollExportQueryDto = z.infer<typeof PayrollExportQuery>;