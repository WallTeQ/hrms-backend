import express from "express";
import * as controller from "./controller";

const router = express.Router();

router.get("/attendance", controller.attendanceSummary);
router.get("/payroll", controller.payrollSummary);
router.get("/headcount", controller.headcount);

export default router;