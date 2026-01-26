import { z } from "zod";

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  employeeId: z.string().nullable(),
  createdAt: z.string(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().optional(),
  employeeId: z.string().uuid().optional(),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().optional(),
  employeeId: z.string().uuid().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;