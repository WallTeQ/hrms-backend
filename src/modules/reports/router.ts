import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import * as controller from "./controller.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.get("/attendance", requirePermission("reports:attendance:read"), controller.attendanceSummary);
router.get("/attendance/department", requirePermission("reports:attendance:read"), controller.attendanceByDepartment);
router.get("/attendance/shift", requirePermission("reports:attendance:read"), controller.attendanceByShift);
router.get("/overtime/shift", requirePermission("reports:attendance:read"), controller.overtimeByShift);
router.get("/payroll", requirePermission("reports:payroll:read"), controller.payrollSummary);
router.get("/headcount", requirePermission("reports:headcount:read"), controller.headcount);
router.get("/dashboard", requirePermission("reports:dashboard:read"), controller.dashboardStats);
router.get("/departments", requirePermission("reports:department:read"), controller.departmentStats);
router.get("/skills", requirePermission("reports:skills:read"), controller.skillStats);
router.get("/performance", requirePermission("reports:performance:read"), controller.performanceReport);
router.get("/performance/shift", requirePermission("reports:performance:read"), controller.performanceByShift);
router.get("/productivity", requirePermission("reports:productivity:read"), controller.departmentProductivity);
router.get("/productivity/shift", requirePermission("reports:productivity:read"), controller.productivityByShift);
router.get("/retirement", requirePermission("reports:retirement:read"), controller.retirementForecast);
router.get("/leave-utilization", requirePermission("reports:leave:read"), controller.leaveUtilization);
router.get("/salary-projections", requirePermission("reports:salary:read"), controller.salaryProjection);

export default router;