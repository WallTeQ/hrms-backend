import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import * as controller from "./controller.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.get("/attendance", controller.attendanceSummary);
router.get("/payroll", controller.payrollSummary);
router.get("/headcount", controller.headcount);
router.get("/dashboard", controller.dashboardStats);

export default router;