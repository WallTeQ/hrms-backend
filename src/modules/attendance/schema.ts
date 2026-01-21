import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]).optional(),
  clockIn: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
  clockOut: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
});
export type MarkAttendanceDto = z.infer<typeof MarkAttendanceSchema>;

export const CreateAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
  clockIn: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
  clockOut: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
});
export type CreateAttendanceDto = z.infer<typeof CreateAttendanceSchema>;

export const AttendanceResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  status: z.string(),
  clockIn: z.string().nullable(),
  clockOut: z.string().nullable(),
});
export type AttendanceResponseDto = z.infer<typeof AttendanceResponseSchema>;