import { z } from "zod";

export const CreateLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "SPECIAL"]),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  reason: z.string().optional().nullable(),
});
export type CreateLeaveRequestDto = z.infer<typeof CreateLeaveRequestSchema>;

export const LeaveRequestResponseSchema = CreateLeaveRequestSchema.extend({ id: z.string(), status: z.string(), createdAt: z.string() });
export type LeaveRequestResponseDto = z.infer<typeof LeaveRequestResponseSchema>;
