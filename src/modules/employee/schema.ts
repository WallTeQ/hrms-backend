import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  password: z.string().min(8),
});

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;

// For update use partial
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;

// Response schema (strip sensitive fields)
export const EmployeeResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeeResponseDto = z.infer<typeof EmployeeResponseSchema>;