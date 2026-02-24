import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import { MarkAttendanceSchema, CreateAttendanceSchema } from "./schema.js";
import * as controller from "./controller.js";
import leaveRequestsRouter from "./leave-requests/router.js";
import leaveBalancesRouter from "./leave-balances/router.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.post("/mark", requirePermission("attendance:mark"), validate(MarkAttendanceSchema), controller.markAttendance);
router.post("/clock-out", requirePermission("attendance:update"), controller.clockOut);
router.post("/", requirePermission("attendance:create"), validate(CreateAttendanceSchema), controller.createAttendance);
router.get("/", requirePermission("attendance:list"), controller.listAttendance);
router.get("/:id", requirePermission("attendance:read"), controller.getAttendance);
router.patch("/:id", requirePermission("attendance:update"), controller.updateAttendance);
router.delete("/:id", requirePermission("attendance:delete"), controller.deleteAttendance);

router.use("/leave-requests", leaveRequestsRouter);
router.use("/leave-balances", leaveBalancesRouter);

export default router;