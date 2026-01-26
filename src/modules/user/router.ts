import express from "express";
import { validate } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { UpdateUserSchema, CreateUserSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.get("/", requirePermission("users:list"), controller.listUsers);
router.post("/", requirePermission("users:create"), validate(CreateUserSchema), controller.createUser);
router.get("/:id", requirePermission("users:read"), controller.getUser);
router.patch("/:id", requirePermission("users:update"), validate(UpdateUserSchema), controller.updateUser);
router.delete("/:id", requirePermission("users:delete"), controller.deleteUser);

export default router;