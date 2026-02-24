import { z } from "zod";

export const CreateLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "UNPAID", "SPECIAL"]),
  startDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  endDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  reason: z.string().optional().nullable(),
  specialApproval: z.boolean().optional(),
  medicalCertificateUrl: z.string().url().optional().nullable(),
  isPaid: z.boolean().optional(),
});
export type CreateLeaveRequestDto = z.infer<typeof CreateLeaveRequestSchema>;

export const LeaveRequestResponseSchema = CreateLeaveRequestSchema.extend({ id: z.string(), status: z.string(), createdAt: z.string() });
export type LeaveRequestResponseDto = z.infer<typeof LeaveRequestResponseSchema>;

export const UpdateLeaveRequestSchema = CreateLeaveRequestSchema.partial();
export type UpdateLeaveRequestDto = z.infer<typeof UpdateLeaveRequestSchema>;

export const UpdateLeaveStatusSchema = z.object({
  status: z.enum(["PENDING_SUPERVISOR", "PENDING_HR", "APPROVED", "REJECTED", "CANCELLED"]),
});
export type UpdateLeaveStatusDto = z.infer<typeof UpdateLeaveStatusSchema>;
