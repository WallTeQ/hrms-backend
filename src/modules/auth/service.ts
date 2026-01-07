import bcrypt from "bcrypt";
import { AuthRepository } from "./repository";
import type { Prisma } from "../../generated/prisma";
import { sendOtpEmail } from "../../infra/mailer";
import {
  setSignupOtp,
  getSignupOtp,
  deleteSignupOtp,
  markSignupVerified,
  isSignupVerified,
  deleteSignupVerified,
} from "../../infra/redis";

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

  getById: async (id: string) => repo.findById(id),

  updatePassword: async (id: string, hashedPassword: string) => repo.updatePassword(id, hashedPassword),

  setEmployeeLink: async (userId: string, employeeId: string) => repo.setEmployeeLink(userId, employeeId),

  updateUser: async (id: string, data: Prisma.UserUpdateInput) => repo.update(id, data),

  list: async (skip = 0, take = 50) => repo.list(skip, take),

  delete: async (id: string) => repo.delete(id),

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
};