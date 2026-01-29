import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import { CreateKpiSchema } from "./kpis/schema.js";
import { CreateEvaluationSchema } from "./evaluations/schema.js";
import kpisRouter from "./kpis/router.js";
import evaluationsRouter from "./evaluations/router.js";
import * as controller from "./controller.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.get("/", controller.head);
router.get("/kpis", controller.listKpis);
router.post("/kpis", requirePermission("performance:kpis:create"), validate(CreateKpiSchema), controller.createKpi);

// Evaluations: create and per-employee listing
router.post("/evaluations", requirePermission("performance:evaluations:create"), validate(CreateEvaluationSchema), controller.createEvaluation);
router.get("/evaluations/employee/:employeeId", controller.listEvaluationsForEmployee);

router.post("/start-review/:employeeId", requirePermission("performance:evaluations:create"), controller.startReview);

router.use("/kpis", kpisRouter);
router.use("/evaluations", evaluationsRouter);

export default router;