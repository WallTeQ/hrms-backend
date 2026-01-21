import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import * as controller from "./controller.js";
import salaryStructuresRouter from "./salary-structures/router.js";
import payslipsRouter from "./payslips/router.js";
import payrollRunsRouter from "./payroll-runs/router.js";
import statutoryDeductionsRouter from "./statutory-deductions/router.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

import { requirePermission } from "../../middlewares/requireRole.js";

router.post("/process", requirePermission("payroll:process"), controller.processPayroll);
router.get("/runs", controller.listPayrollRuns);
router.get("/runs/:id", controller.getPayrollRun);

router.use("/salary-structures", salaryStructuresRouter);
router.use("/payslips", payslipsRouter);
router.use("/runs", payrollRunsRouter);
router.use("/statutory-deductions", statutoryDeductionsRouter);

export default router;