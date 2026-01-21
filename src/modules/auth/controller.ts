import { Request, Response } from "express";
import { AuthService } from "./service.js";
import type { RegisterDto, LoginDto, RequestPasswordResetOtpDto, VerifyPasswordResetOtpDto, ResetPasswordDto, ChangePasswordDto } from "./schema.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import { recordFailedLogin, clearFailedLogin, auditAuthEvent, revokeToken } from "../../middlewares/security.js";
import { generateTokens, verifyRefreshToken } from "../../common/jwt.js";

export async function register(req: Request, res: Response) {
  try {
    const payload = req.body as RegisterDto;
    const user = await AuthService.register(payload.email, payload.password, payload.firstName, payload.lastName);
    // scrub password
    delete user.password;
    await cacheDelByPrefix("users:list");
    return res.status(201).json({ status: "success", data: user });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to register" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const payload = req.body as LoginDto;

    // Attempt auth
    const user = await AuthService.authenticate(payload.email, payload.password);

    if (!user) {
      // record failed attempt for brute force protection
      await recordFailedLogin(payload.email);
      await auditAuthEvent("login:failed", { email: payload.email, ip: req.ip });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // clear any failed counters on success
    await clearFailedLogin((payload as any).email);
    await auditAuthEvent("login:success", { id: user.id, email: user.email, ip: req.ip });

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId || undefined,
    });

    // Exclude password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({ status: "success", data: { user: userWithoutPassword, tokens } });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Login failed" });
  }
}

// OTP signup flow controllers
export async function requestSignupOtp(req: Request, res: Response) {
  try {
    const { email } = req.body;
    await AuthService.requestSignupOtp(email);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}

export async function verifySignupOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;
    await AuthService.verifySignupOtp(email, otp);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}

export async function completeSignup(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName } = req.body;
    const user = await AuthService.completeSignup(email, password, firstName, lastName);
    delete user.password;
    await cacheDelByPrefix("users:list");
    return res.status(201).json({ status: "success", data: user });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(400).json({ error: "No token provided" });
    const token = auth.slice(7);
    // revoke token until its expiry
    await revokeToken(token);
    await auditAuthEvent("logout", { ip: req.ip });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Logout failed" });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const payload = verifyRefreshToken(refreshToken);
    const newTokens = generateTokens(payload);

    return res.json({ status: "success", data: newTokens });
  } catch (err: any) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
}

// Password reset flow controllers
export async function requestPasswordResetOtp(req: Request, res: Response) {
  try {
    const { email } = req.body as RequestPasswordResetOtpDto;
    await AuthService.requestPasswordResetOtp(email);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}

export async function verifyPasswordResetOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body as VerifyPasswordResetOtpDto;
    await AuthService.verifyPasswordResetOtp(email, otp);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, password } = req.body as ResetPasswordDto;
    await AuthService.resetPassword(email, password);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const payload = req.body as ChangePasswordDto;
    await AuthService.changePassword(user.id, payload.oldPassword, payload.newPassword);
    await auditAuthEvent("password:changed", { id: user.id, email: user.email, ip: req.ip });
    return res.json({ status: "success", message: "Password changed successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message });
  }
}