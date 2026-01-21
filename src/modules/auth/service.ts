import bcrypt from "bcrypt";
import { AuthRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import { sendOtpEmail } from "../../infra/mailer.js";
import {
  setSignupOtp,
  getSignupOtp,
  deleteSignupOtp,
  markSignupVerified,
  isSignupVerified,
  deleteSignupVerified,
  setPasswordResetOtp,
  getPasswordResetOtp,
  deletePasswordResetOtp,
  markPasswordResetVerified,
  isPasswordResetVerified,
  deletePasswordResetVerified,
} from "../../infra/redis.js";

const repo = AuthRepository();

export const AuthService = {
  register: async (email: string, password: string, firstName: string, lastName: string) => {
    const existing = await repo.findByEmail(email);
    if (existing) throw new Error("Email already in use");
    const hashed = await bcrypt.hash(password, 10);
    return repo.createUser({ email, password: hashed, role: "EMPLOYEE", employee: { create: { firstName, lastName, email } } as any });
  },

  authenticate: async (email: string, password: string) => {
    const user = await repo.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;
    return user;
  },

  updatePassword: async (id: string, hashedPassword: string) => repo.updatePassword(id, hashedPassword),

  setEmployeeLink: async (userId: string, employeeId: string) => repo.setEmployeeLink(userId, employeeId),

  // OTP signup flow
  requestSignupOtp: async (email: string) => {
    const existing = await repo.findByEmail(email);
    if (existing) throw new Error("Email already in use");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await setSignupOtp(email, otp, 300); // 5min
    await sendOtpEmail(email, otp);
    return { ok: true };
  },

  verifySignupOtp: async (email: string, otp: string) => {
    const stored = await getSignupOtp(email);
    if (!stored) throw new Error("OTP expired or not requested");
    if (stored !== otp) throw new Error("Invalid OTP");
    await deleteSignupOtp(email);
    await markSignupVerified(email, 900); // 15min
    return { ok: true };
  },

  completeSignup: async (email: string, password: string, firstName: string, lastName: string) => {
    const verified = await isSignupVerified(email);
    if (!verified) throw new Error("Email not verified or verification expired");
    await deleteSignupVerified(email);
    return AuthService.register(email, password, firstName, lastName);
  },

  // Password reset flow
  requestPasswordResetOtp: async (email: string) => {
    const user = await repo.findByEmail(email);
    if (!user) throw new Error("User not found");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await setPasswordResetOtp(email, otp, 300); // 5min
    await sendOtpEmail(email, otp);
    return { ok: true };
  },

  verifyPasswordResetOtp: async (email: string, otp: string) => {
    const stored = await getPasswordResetOtp(email);
    if (!stored) throw new Error("OTP expired or not requested");
    if (stored !== otp) throw new Error("Invalid OTP");
    await deletePasswordResetOtp(email);
    await markPasswordResetVerified(email, 900); // 15min
    return { ok: true };
  },

  resetPassword: async (email: string, password: string) => {
    const verified = await isPasswordResetVerified(email);
    if (!verified) throw new Error("Email not verified or verification expired");
    const hashed = await bcrypt.hash(password, 10);
    const user = await repo.findByEmail(email);
    if (!user) throw new Error("User not found");
    await repo.updatePassword(user.id, hashed);
    await deletePasswordResetVerified(email);
    return { ok: true };
  },

  changePassword: async (userId: string, oldPassword: string, newPassword: string) => {
    const user = await repo.findById(userId);
    if (!user) throw new Error("User not found");
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new Error("Old password is incorrect");
    const hashed = await bcrypt.hash(newPassword, 10);
    await repo.updatePassword(userId, hashed);
    return { ok: true };
  },
};