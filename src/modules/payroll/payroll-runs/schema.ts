import { z } from "zod";

export const CreatePayrollRunSchema = z.object({
  period: z.string().min(1),
});
export type CreatePayrollRunDto = z.infer<typeof CreatePayrollRunSchema>;

export const PayrollRunResponseSchema = z.object({
  id: z.string(),
  period: z.string(),
  runAt: z.string(),
  status: z.string(),
});
export type PayrollRunResponseDto = z.infer<typeof PayrollRunResponseSchema>;
