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

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.string(),
    createdAt: z.string(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;

// Signup OTP flow schemas
export const RequestOtpSchema = z.object({ email: z.string().email() });
export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({ email: z.string().email(), otp: z.string().length(6) });
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const CompleteSignupSchema = RegisterSchema.extend({ email: z.string().email() });
export type CompleteSignupDto = z.infer<typeof CompleteSignupSchema>;

// Password reset schemas
export const RequestPasswordResetOtpSchema = z.object({ email: z.string().email() });
export type RequestPasswordResetOtpDto = z.infer<typeof RequestPasswordResetOtpSchema>;

export const VerifyPasswordResetOtpSchema = z.object({ email: z.string().email(), otp: z.string().length(6) });
export type VerifyPasswordResetOtpDto = z.infer<typeof VerifyPasswordResetOtpSchema>;

export const ResetPasswordSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

// Change password schema
export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;