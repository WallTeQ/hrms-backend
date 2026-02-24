import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { CreateLeaveRequestSchema, UpdateLeaveRequestSchema, UpdateLeaveStatusSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.post("/", requirePermission("leave:request:create"), validate(CreateLeaveRequestSchema), controller.createLeaveRequest);
router.get("/employee/:employeeId", requirePermission("leave:request:list"), controller.listLeaveRequestsForEmployee);
router.get("/:id", requirePermission("leave:request:read"), controller.getLeaveRequest);
router.patch("/:id", requirePermission("leave:request:update"), validate(UpdateLeaveRequestSchema), controller.updateLeaveRequest);
router.patch("/:id/status", requirePermission("leave:request:approve"), validate(UpdateLeaveStatusSchema), controller.updateLeaveStatus);
router.delete("/:id", requirePermission("leave:request:delete"), controller.deleteLeaveRequest);

export default router;
