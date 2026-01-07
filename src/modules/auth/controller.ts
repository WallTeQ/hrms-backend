import { Request, Response } from "express";
import { AuthService } from "./service";
import type { RegisterDto, LoginDto } from "./schema";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis";
import { recordFailedLogin, clearFailedLogin, auditAuthEvent, revokeToken } from "../../middlewares/security";

export async function register(req: Request, res: Response) {
  try {
    const payload = req.body as RegisterDto;
    const user = await AuthService.register(payload.email, payload.password, payload.firstName, payload.lastName);
    // scrub password
    delete user.password;
    await cacheDelByPrefix("users:list");
    return res.status(201).json(user);
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

    delete user.password;
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Login failed" });
  }
}

export async function getUser(req: Request, res: Response) {
  const id = req.params.id;
  const user = await AuthService.getById(id);
  if (!user) return res.status(404).json({ error: "Not found" });
  delete user.password;
  return res.json(user);
}

export async function listUsers(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `users:list:skip=${skip}:take=${take}`;
  const users = await cacheWrap(key, 60, () => AuthService.list(skip, take));
  // scrub passwords
  const safe = users.map((u: any) => {
    const copy = { ...u };
    delete copy.password;
    return copy;
  });
  return res.json(safe);
}

export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const updated = await AuthService.updateUser(id, payload as any);
    if (!updated) return res.status(404).json({ error: "Not found" });
    delete (updated as any).password;
    await cacheDelByPrefix("users:list");
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to update user" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const id = req.params.id;
  await AuthService.delete(id);
  await cacheDelByPrefix("users:list");
  return res.status(204).send();
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
    return res.status(201).json(user);
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