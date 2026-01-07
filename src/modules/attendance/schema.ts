import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});
export type MarkAttendanceDto = z.infer<typeof MarkAttendanceSchema>;

export const AttendanceResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  status: z.string(),
  clockIn: z.string().nullable(),
  clockOut: z.string().nullable(),
});
export type AttendanceResponseDto = z.infer<typeof AttendanceResponseSchema>;