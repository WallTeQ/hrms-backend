import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { CreateInterviewSchema, UpdateInterviewSchema } from "./schema.js";
import * as controller from "./controller.js";
import { authMiddleware } from "../../../middlewares/auth.js";

const router = express.Router();
router.use(authMiddleware);

router.post("/", requirePermission("recruitment:interviews:create"), validate(CreateInterviewSchema), controller.schedule);
router.get("/:id", requirePermission("recruitment:interviews:read"), controller.getInterview);
router.patch("/:id", requirePermission("recruitment:interviews:update"), validate(UpdateInterviewSchema), controller.updateInterview);
router.delete("/:id", requirePermission("recruitment:interviews:delete"), controller.deleteInterview);

export default router;