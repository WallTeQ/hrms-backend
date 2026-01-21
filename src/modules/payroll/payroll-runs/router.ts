import express from "express";
import { requirePermission } from "../../../middlewares/requireRole.js";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/", controller.listRuns);
router.get("/:id", controller.getRun);
router.post("/:id/process", requirePermission("payroll:run:process"), controller.processRun);
router.patch("/:id", controller.updateRun);
router.delete("/:id", controller.deleteRun);

export default router;