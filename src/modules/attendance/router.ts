import express from "express";
import { validate } from "../../middlewares/validate";
import { MarkAttendanceSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/mark", validate(MarkAttendanceSchema), controller.markAttendance);
router.post("/", controller.createAttendance);
router.get("/", controller.listAttendance);
router.get("/:id", controller.getAttendance);
router.patch("/:id", controller.updateAttendance);
router.delete("/:id", controller.deleteAttendance);

export default router;