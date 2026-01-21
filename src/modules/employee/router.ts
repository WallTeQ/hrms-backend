import express from "express";
import { validate } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { CreateEmployeeSchema, UpdateEmployeeSchema } from "./schema.js";
import * as controller from "./controller.js";

// subrouters
import contractsRouter from "./contracts/router.js";
import documentsRouter from "./documents/router.js";
import disciplinaryRecordsRouter from "./disciplinary-records/router.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.post("/", requirePermission("employees:create"), validate(CreateEmployeeSchema), controller.createEmployee);
router.get("/", requirePermission("employees:list"), controller.listEmployees);
router.get("/:id", requirePermission("employees:read"), controller.getEmployee);
router.patch("/:id", requirePermission("employees:update"), validate(UpdateEmployeeSchema), controller.updateEmployee);
router.delete("/:id", requirePermission("employees:delete"), controller.deleteEmployee);

router.use("/:employeeId/contracts", contractsRouter);
router.use("/:employeeId/documents", documentsRouter);
router.use("/:employeeId/disciplinary-records", disciplinaryRecordsRouter);

export default router;