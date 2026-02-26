import { Request, Response } from "express";
import { AuthService } from "./service.js";
import type { RegisterDto, LoginDto, RequestPasswordResetOtpDto, VerifyPasswordResetOtpDto, ResetPasswordDto, ChangePasswordDto } from "./schema.js";
import { cacheWrap, cacheDelByPrefix, cacheSet } from "../../infra/redis.js";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  let domain: string | undefined = undefined;
  if (process.env.AUTH_COOKIE_DOMAIN) {
    try {
      domain = new URL(process.env.AUTH_COOKIE_DOMAIN).hostname;
    } catch {
      domain = process.env.AUTH_COOKIE_DOMAIN;
    }
  }
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (process.env.AUTH_COOKIE_SAMESITE || (isProd ? "strict" : "lax")) as "strict" | "lax" | "none",
    domain,
    path: "/",
  };
}

export async function register(req: Request, res: Response) {
  const payload = req.body as RegisterDto;
  const user = await AuthService.register(payload.email, payload.password, payload.firstName, payload.lastName);
  // scrub password
  delete user.password;
  await cacheDelByPrefix("users:list");
  try { await cacheSet("users:version", Date.now().toString()); } catch (e) {}
  return res.status(201).json({ status: "success", data: user });
}

export async function login(req: Request, res: Response) {
  const payload = req.body as LoginDto;
  const result = await AuthService.login(payload.email, payload.password, { ip: req.ip });

  // Exclude password from response
  const { password, ...userWithoutPassword } = result.user;
  const cookieOptions = getCookieOptions();
  res.cookie(ACCESS_COOKIE, result.tokens.accessToken, { ...cookieOptions, maxAge: 2 * 24 * 60 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({ status: "success", data: { user: userWithoutPassword } });
}

// OTP signup flow controllers
export async function requestSignupOtp(req: Request, res: Response) {
  const { email } = req.body;
  await AuthService.requestSignupOtp(email);
  return res.json({ ok: true });
}

export async function verifySignupOtp(req: Request, res: Response) {
  const { email, otp } = req.body;
  await AuthService.verifySignupOtp(email, otp);
  return res.json({ ok: true });
}

export async function completeSignup(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;
  const user = await AuthService.completeSignup(email, password, firstName, lastName);
  delete user.password;
  await cacheDelByPrefix("users:list");
  return res.status(201).json({ status: "success", data: user });
}

export async function logout(req: Request, res: Response) {
  const auth = req.headers.authorization;
  const bearerToken = auth && auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cookieToken = (req as any).cookies?.access_token as string | undefined;
  const token = cookieToken || bearerToken;
  await AuthService.logout(token, { ip: req.ip, userId: (req as any).user?.id });
  const cookieOptions = getCookieOptions();
  res.clearCookie(ACCESS_COOKIE, cookieOptions);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  return res.json({ ok: true });
}

export async function refreshToken(req: Request, res: Response) {
  const bodyToken = (req.body && req.body.refreshToken) as string | undefined;
  const cookieToken = (req as any).cookies?.refresh_token as string | undefined;
  const refreshToken = bodyToken || cookieToken || "";
  const newTokens = await AuthService.refreshTokens(refreshToken);

  const cookieOptions = getCookieOptions();
  res.cookie(ACCESS_COOKIE, newTokens.accessToken, { ...cookieOptions, maxAge: 2 * 24 * 60 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, newTokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({ status: "success" });
}

// Password reset flow controllers
export async function requestPasswordResetOtp(req: Request, res: Response) {
  const { email } = req.body as RequestPasswordResetOtpDto;
  await AuthService.requestPasswordResetOtp(email);
  return res.json({ ok: true });
}

export async function verifyPasswordResetOtp(req: Request, res: Response) {
  const { email, otp } = req.body as VerifyPasswordResetOtpDto;
  await AuthService.verifyPasswordResetOtp(email, otp);
  return res.json({ ok: true });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, password } = req.body as ResetPasswordDto;
  await AuthService.resetPassword(email, password);
  return res.json({ ok: true });
}

export async function changePassword(req: Request, res: Response) {
  const user = (req as any).user;
  const payload = req.body as ChangePasswordDto;
  await AuthService.changePassword(user.id, payload.oldPassword, payload.newPassword, { ip: req.ip, email: user.email });
  return res.json({ status: "success", message: "Password changed successfully" });
}