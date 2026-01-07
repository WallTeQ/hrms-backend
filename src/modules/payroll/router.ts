import express from "express";
import * as controller from "./controller";
import salaryStructuresRouter from "./salary-structures/router";
import payslipsRouter from "./payslips/router";
import payrollRunsRouter from "./payroll-runs/router";
import statutoryDeductionsRouter from "./statutory-deductions/router";

const router = express.Router();

router.post("/process", controller.processPayroll);
router.get("/runs", controller.listPayrollRuns);
router.get("/runs/:id", controller.getPayrollRun);

router.use("/salary-structures", salaryStructuresRouter);
router.use("/payslips", payslipsRouter);
router.use("/runs", payrollRunsRouter);
router.use("/statutory-deductions", statutoryDeductionsRouter);

export default router;