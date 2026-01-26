import { Request, Response } from "express";
import bcrypt from "bcryptjs";
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
  if (!requestedUser) return res.status(404).json({ error: "Not found" });
  delete requestedUser.password;
  return res.json(requestedUser);
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
  try {
    const payload = req.body as any;
    // Log a sanitized copy of the incoming payload for debugging (do not log raw passwords)
    try {
      const sanitized = { ...payload, password: payload.password ? "***REDACTED***" : undefined };
      console.debug("createUser payload:", sanitized, "actor:", (req as any).user?.id || null);
    } catch (e) {}

    const hashed = await bcrypt.hash(payload.password, 10);

    // Build Prisma create payload. The User model does not have firstName/lastName fields,
    // so if firstName/lastName are provided we create a nested employee. If employeeId
    // is provided we connect to an existing employee instead.
    const toCreate: any = {
      email: payload.email,
      password: hashed,
      role: payload.role,
    };

    if (payload.employeeId) {
      // connect existing employee
      toCreate.employee = { connect: { id: payload.employeeId } };
    } else if (payload.firstName || payload.lastName) {
      // create new employee record in a nested create
      toCreate.employee = {
        create: {
          firstName: payload.firstName || "",
          lastName: payload.lastName || "",
          email: payload.email,
        },
      };
    }

    const created = await UserService.createUser(toCreate as any);
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
  } catch (err: any) {
    // Log error details to aid debugging (Prisma/Zod/etc.)
    try {
      console.error("createUser error:", err?.code || "", err?.message || "", err);
    } catch (e) {}

    if (err?.code === "P2002") {
      // Unique constraint failed on email
      return res.status(409).json({ error: "Email already exists", errors: { email: "Email already exists" } });
    }
    return res.status(400).json({ error: err?.message ?? "Failed to create user" });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const payload = req.body as any;
    const user = (req as any).user;

    // Check if role is being changed - only HR_ADMIN can change roles
    if (payload.role && payload.role !== user.role) {
      if (user.role !== "HR_ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only HR_ADMIN can change roles" });
      }
    }

    // Extract employee-related fields so we don't pass unknown args to Prisma
    const { firstName, lastName, employeeId, ...userPayload } = payload;
    let employeeData: any = undefined;
    if (firstName !== undefined || lastName !== undefined) {
      employeeData = {} as any;
      if (firstName !== undefined) employeeData.firstName = firstName;
      if (lastName !== undefined) employeeData.lastName = lastName;
    }

    if (employeeId) {
      // If admin provided employeeId we pass it through for connect logic
      userPayload.employeeId = employeeId;
    }

    const updated = await UserService.updateUser(id, userPayload as any, user.id, employeeData);
    if (!updated) return res.status(404).json({ error: "Not found" });
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
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to update user" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const id = req.params.id;
  await UserService.delete(id);
  await cacheDelByPrefix("users:list");
  return res.status(204).send();
}