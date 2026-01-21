import { Request, Response } from "express";
import { UserService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
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
  return res.json({ status: "success", ...paginated });
}

export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const user = (req as any).user;

    // Check if role is being changed - only HR_ADMIN can change roles
    if (payload.role && payload.role !== user.role) {
      if (user.role !== "HR_ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only HR_ADMIN can change roles" });
      }
    }

    const updated = await UserService.updateUser(id, payload as any, user.id);
    if (!updated) return res.status(404).json({ error: "Not found" });
    delete (updated as any).password;
    await cacheDelByPrefix("users:list");
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