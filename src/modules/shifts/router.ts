import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import { validate } from "../../middlewares/validate.js";
import { CreateShiftSchema, UpdateShiftSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requirePermission("shifts:create"), validate(CreateShiftSchema), controller.createShift);
router.get("/", requirePermission("shifts:list"), controller.listShifts);
router.get("/:id", requirePermission("shifts:read"), controller.getShift);
router.patch("/:id", requirePermission("shifts:update"), validate(UpdateShiftSchema), controller.updateShift);
router.delete("/:id", requirePermission("shifts:delete"), controller.deleteShift);

export default router;
