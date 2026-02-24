import bcrypt from "bcrypt";
import { AuthRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import { sendOtpEmail } from "../../infra/mailer.js";
import prismaDefault from "../../infra/database.js";
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
import { auditAuthEvent, auditAuthEventDb, clearFailedLogin, recordFailedLogin, revokeToken } from "../../middlewares/security.js";
import { generateTokens, verifyRefreshToken } from "../../common/jwt.js";
import { generateEmployeeId } from "../../common/employeeId.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../common/domain/errors.js";

const repo = AuthRepository();

export const AuthService = {
  register: async (email: string, password: string, firstName: string, lastName: string) =>
    serviceGuard(async () => {
      const existing = await repo.findByEmail(email);
      if (existing) throw new ConflictError("Email already in use", { field: "email" });
      const hashed = await bcrypt.hash(password, 10);
      return prismaDefault.$transaction(async (tx: Prisma.TransactionClient) => {
        const employeeId = await generateEmployeeId(tx);
        // ensure we have a default shift to attach new employees to
        const defaultShift = await tx.shift.findUnique({ where: { name: "Default" } });
        if (!defaultShift) {
          throw new Error("Default shift not found; make sure database is seeded properly");
        }
        const employee = await tx.employee.create({
          data: {
            id: employeeId,
            firstName,
            lastName,
            email,
            shift: { connect: { id: defaultShift.id } },
          },
        });
        return tx.user.create({
          data: {
            id: employee.id,
            email,
            password: hashed,
            role: "EMPLOYEE",
          },
        });
      });
    }),

  authenticate: async (email: string, password: string) =>
    serviceGuard(async () => {
      const user = await repo.findByEmail(email);
      if (!user) return null;
      const match = await bcrypt.compare(password, user.password);
      if (!match) return null;
      return user;
    }),

  login: async (email: string, password: string, context: { ip?: string }) =>
    serviceGuard(async () => {
      const user = await AuthService.authenticate(email, password);
      if (!user) {
        await recordFailedLogin(email);
        await auditAuthEvent("login:failed", { email, ip: context.ip });
        await auditAuthEventDb("LOGIN_FAILED", { email, ip: context.ip });
        throw new UnauthorizedError("Invalid credentials");
      }

      await clearFailedLogin(email);
      await auditAuthEvent("login:success", { id: user.id, email: user.email, ip: context.ip });
      await auditAuthEventDb("LOGIN_SUCCESS", { email: user.email, ip: context.ip }, user.id);

      const tokens = generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.id,
      });

      return { user, tokens };
    }),

  updatePassword: async (id: string, hashedPassword: string) =>
    serviceGuard(async () => repo.updatePassword(id, hashedPassword)),

  // OTP signup flow
  requestSignupOtp: async (email: string) =>
    serviceGuard(async () => {
      const existing = await repo.findByEmail(email);
      if (existing) throw new ConflictError("Email already in use", { field: "email" });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await setSignupOtp(email, otp, 300); // 5min
      await sendOtpEmail(email, otp);
      return { ok: true };
    }),

  verifySignupOtp: async (email: string, otp: string) =>
    serviceGuard(async () => {
      const stored = await getSignupOtp(email);
      if (!stored) throw new ValidationError("OTP expired or not requested");
      if (stored !== otp) throw new ValidationError("Invalid OTP");
      await deleteSignupOtp(email);
      await markSignupVerified(email, 900); // 15min
      return { ok: true };
    }),

  completeSignup: async (email: string, password: string, firstName: string, lastName: string) =>
    serviceGuard(async () => {
      const verified = await isSignupVerified(email);
      if (!verified) throw new ValidationError("Email not verified or verification expired");
      await deleteSignupVerified(email);
      return AuthService.register(email, password, firstName, lastName);
    }),

  // Password reset flow
  requestPasswordResetOtp: async (email: string) =>
    serviceGuard(async () => {
      const user = await repo.findByEmail(email);
      if (!user) throw new NotFoundError("User not found", { email });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await setPasswordResetOtp(email, otp, 300); // 5min
      await sendOtpEmail(email, otp);
      return { ok: true };
    }),

  verifyPasswordResetOtp: async (email: string, otp: string) =>
    serviceGuard(async () => {
      const stored = await getPasswordResetOtp(email);
      if (!stored) throw new ValidationError("OTP expired or not requested");
      if (stored !== otp) throw new ValidationError("Invalid OTP");
      await deletePasswordResetOtp(email);
      await markPasswordResetVerified(email, 900); // 15min
      return { ok: true };
    }),

  resetPassword: async (email: string, password: string) =>
    serviceGuard(async () => {
      const verified = await isPasswordResetVerified(email);
      if (!verified) throw new ValidationError("Email not verified or verification expired");
      const hashed = await bcrypt.hash(password, 10);
      const user = await repo.findByEmail(email);
      if (!user) throw new NotFoundError("User not found", { email });
      await repo.updatePassword(user.id, hashed);
      await deletePasswordResetVerified(email);
      return { ok: true };
    }),

  changePassword: async (userId: string, oldPassword: string, newPassword: string, context: { ip?: string; email?: string }) =>
    serviceGuard(async () => {
      const user = await repo.findById(userId);
      if (!user) throw new NotFoundError("User not found", { userId });
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) throw new ValidationError("Old password is incorrect");
      const hashed = await bcrypt.hash(newPassword, 10);
      await repo.updatePassword(userId, hashed);
      await auditAuthEvent("password:changed", { id: userId, email: context.email, ip: context.ip });
      await auditAuthEventDb("PASSWORD_CHANGED", { email: context.email, ip: context.ip }, userId);
      return { ok: true };
    }),

  logout: async (token: string, context: { ip?: string; userId?: string }) =>
    serviceGuard(async () => {
      if (!token) throw new ValidationError("No token provided");
      await revokeToken(token);
      await auditAuthEvent("logout", { ip: context.ip });
      await auditAuthEventDb("LOGOUT", { ip: context.ip }, context.userId);
      return { ok: true };
    }),

  refreshTokens: async (refreshToken: string) =>
    serviceGuard(async () => {
      if (!refreshToken) throw new ValidationError("Refresh token required");
      try {
        const payload = verifyRefreshToken(refreshToken);
        return generateTokens(payload);
      } catch {
        throw new UnauthorizedError("Invalid refresh token");
      }
    }),
};