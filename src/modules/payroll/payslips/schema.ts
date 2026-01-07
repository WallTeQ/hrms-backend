import { z } from "zod";

export const CreatePayslipSchema = z.object({
  payrollRunId: z.string().uuid(),
  employeeId: z.string().uuid(),
  gross: z.number(),
  net: z.number(),
});
export type CreatePayslipDto = z.infer<typeof CreatePayslipSchema>;

export const PayslipResponseSchema = z.object({
  id: z.string(),
  payrollRunId: z.string(),
  employeeId: z.string(),
  gross: z.number(),
  net: z.number(),
  generatedAt: z.string(),
});
export type PayslipResponseDto = z.infer<typeof PayslipResponseSchema>;
