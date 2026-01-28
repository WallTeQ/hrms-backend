import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  password: z.string().min(8),
  departmentId: z.string().optional().nullable(),
});

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;

// For update use partial and add position
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
  position: z.string().optional(),
});
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;

// Response schema (strip sensitive fields)
export const EmployeeResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  department: z.object({
    id: z.string(),
    name: z.string(),
  }).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeeResponseDto = z.infer<typeof EmployeeResponseSchema>;