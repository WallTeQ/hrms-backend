import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { MarkAttendanceSchema, CreateAttendanceSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.post("/mark", validate(MarkAttendanceSchema), controller.markAttendance);
router.post("/clock-out", controller.clockOut);
router.post("/", validate(CreateAttendanceSchema), controller.createAttendance);
router.get("/", controller.listAttendance);
router.get("/:id", controller.getAttendance);
router.patch("/:id", controller.updateAttendance);
router.delete("/:id", controller.deleteAttendance);

export default router;