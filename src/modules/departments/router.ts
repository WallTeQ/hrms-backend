import express from "express";
import * as controller from "./controller.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { CreateDepartmentSchema, UpdateDepartmentSchema } from "./schema.js";
import { requirePermission } from "../../middlewares/requireRole.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", requirePermission("departments:list"), controller.listDepartments);
router.post("/", requirePermission("departments:create"), validate(CreateDepartmentSchema), controller.createDepartment);
router.get("/:id", requirePermission("departments:get"), controller.getDepartment);
router.patch("/:id", requirePermission("departments:update"), validate(UpdateDepartmentSchema), controller.updateDepartment);
router.delete("/:id", requirePermission("departments:delete"), controller.deleteDepartment);
router.get("/:id/employees", requirePermission("departments:list"), controller.listEmployeesInDepartment);
router.get("/stats/overview", requirePermission("departments:list"), controller.getDepartmentStats);

export default router;