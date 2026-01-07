import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  employeeId: z.string().nullable(),
  createdAt: z.string(),
});
export type UserResponseDto = z.infer<typeof UserResponseSchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().optional(),
  employeeId: z.string().uuid().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

// Signup OTP flow schemas
export const RequestOtpSchema = z.object({ email: z.string().email() });
export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({ email: z.string().email(), otp: z.string().length(6) });
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const CompleteSignupSchema = RegisterSchema.extend({ email: z.string().email() });
export type CompleteSignupDto = z.infer<typeof CompleteSignupSchema>;