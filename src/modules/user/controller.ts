import { Request, Response } from "express";
import { createHash } from "crypto";
import { UserService } from "./service.js";
import { cacheWrap, cacheDelByPrefix, cacheSet, cacheGet } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function getUser(req: Request, res: Response) {
  const id = req.params.id;
  const user = (req as any).user;
  const role = user?.role || 'anonymous';
  const key = `users:detail:${id}:role=${role}`;
  const requestedUser = await cacheWrap(key, 300, () => UserService.getById(id, user));
  delete requestedUser.password;
  return res.json(requestedUser);
}

export async function getCurrentUser(req: Request, res: Response) {
  const payload = (req as any).user;
  if (!payload?.id) return res.status(401).json({ error: "Unauthorized" });
  const current = await UserService.getById(payload.id, payload);
  delete (current as any).password;
  return res.json({ status: "success", data: current });
}

export async function listUsers(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  const role = user?.role || 'anonymous';
  const key = `users:list:role=${role}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => UserService.list(skip, take, user)) as { items: any[]; total: number };
  const { items, total } = result;
  // scrub passwords
  const safe = items.map((u: any) => {
    const copy = { ...u };
    delete copy.password;
    return copy;
  });
  const paginated = createPaginationResult(safe, total, { ...pagination, page: page || 1 });

  // Determine an ETag based on a version key (if available) or a computed hash of the payload.
  // This allows proxies/clients to revalidate using If-None-Match and ensures we return 200
  // when the underlying version changes (we bump `users:version` on writes).
  let currentVer: string | null = null;
  try {
    currentVer = await cacheGet("users:version");
  } catch (e) {}

  if (!currentVer) {
    // fallback: compute a stable hash of the response payload and set it as version
    try {
      const hash = createHash("sha1").update(JSON.stringify(paginated)).digest("hex");
      currentVer = hash;
      try { await cacheSet("users:version", currentVer); } catch (e) {}
    } catch (e) {
      // ignore hashing errors; leave currentVer null
    }
  }

  const etag = currentVer ? `"${currentVer}"` : undefined;
  if (etag) {
    res.setHeader("ETag", etag);
    res.setHeader("X-Users-Version", currentVer as string);
    const clientTag = (req.headers["if-none-match"] as string | undefined) || undefined;
    if (clientTag && clientTag === etag) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(304).send();
    }
  }

  // Ensure clients don't serve stale cached responses without revalidation
  res.setHeader("Cache-Control", "no-cache");
  return res.json({ status: "success", ...paginated });
}

export async function createUser(req: Request, res: Response) {
  const payload = req.body as any;
  // Log a sanitized copy of the incoming payload for debugging (do not log raw passwords)
  try {
    const sanitized = { ...payload, password: payload.password ? "***REDACTED***" : undefined };
    console.debug("createUser payload:", sanitized, "actor:", (req as any).user?.id || null);
  } catch (e) {}

  const created = await UserService.createUser({
    email: payload.email,
    password: payload.password,
    role: payload.role,
    firstName: payload.firstName,
    lastName: payload.lastName,
  });
  delete (created as any).password;
  await cacheDelByPrefix("users:list");
  try { await cacheSet("users:version", Date.now().toString()); } catch (e) {}

  // Add ETag / X-Users-Version headers so clients can immediately update their cache state
  try {
    const ver = await cacheGet("users:version");
    if (ver) {
      res.setHeader("ETag", `"${ver}"`);
      res.setHeader("X-Users-Version", ver);
    }
  } catch (e) {}

  return res.status(201).json({ status: "success", data: created });
}

export async function updateUser(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as any;
  const user = (req as any).user;

  const updated = await UserService.updateUser(id, payload as any, user);
  delete (updated as any).password;

  // Invalidate list cache and bump version so clients revalidate
  await cacheDelByPrefix("users:list");
  try { await cacheSet("users:version", Date.now().toString()); } catch (e) {}

  // Attach updated cache version to response headers when available
  try {
    const ver = await cacheGet("users:version");
    if (ver) {
      res.setHeader("ETag", `"${ver}"`);
      res.setHeader("X-Users-Version", ver);
    }
  } catch (e) {}

  return res.json({ status: "success", data: updated });
}

export async function deleteUser(req: Request, res: Response) {
  const id = req.params.id;
  await UserService.delete(id);
  await cacheDelByPrefix("users:list");
  return res.status(204).send();
}