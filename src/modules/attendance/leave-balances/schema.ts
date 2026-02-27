import { z } from "zod";

export const LeaveBalanceSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  year: z.number().int(),
  balance: z.number(),
});
export type LeaveBalanceDto = z.infer<typeof LeaveBalanceSchema>;

export const LeaveBalanceResponseSchema = LeaveBalanceSchema.extend({ id: z.string() });
export type LeaveBalanceResponseDto = z.infer<typeof LeaveBalanceResponseSchema>;
