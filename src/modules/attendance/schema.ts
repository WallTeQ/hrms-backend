import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE"]).optional(),
  clockIn: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
  clockOut: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
  entryMethod: z.enum(["SYSTEM", "MANUAL"]).optional(),
  overtimeApproved: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});
export type MarkAttendanceDto = z.infer<typeof MarkAttendanceSchema>;

export const CreateAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE"]),
  clockIn: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
  clockOut: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }).optional(),
  entryMethod: z.enum(["SYSTEM", "MANUAL"]).optional(),
  overtimeApproved: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});
export type CreateAttendanceDto = z.infer<typeof CreateAttendanceSchema>;

export const AttendanceResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  status: z.string(),
  clockIn: z.string().nullable(),
  clockOut: z.string().nullable(),
  entryMethod: z.string().optional().nullable(),
  workMinutes: z.number().optional().nullable(),
  overtimeMinutes: z.number().optional().nullable(),
  lateMinutes: z.number().optional().nullable(),
  earlyDepartureMinutes: z.number().optional().nullable(),
});
export type AttendanceResponseDto = z.infer<typeof AttendanceResponseSchema>;