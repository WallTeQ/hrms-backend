import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreateSalaryStructureSchema, BaseCreateSalaryStructureSchema } from "./schema.js";
import * as controller from "./controller.js";
import { requirePermission } from "../../../middlewares/requireRole.js";

const router = express.Router();

router.post(
  "/",
  requirePermission("payroll:salary-structures:create"),
  validate(CreateSalaryStructureSchema),
  controller.createSalaryStructure
);
router.patch(
  "/:id",
  requirePermission("payroll:salary-structures:update"),
  validate(BaseCreateSalaryStructureSchema.partial()),
  controller.updateSalaryStructure
);
router.delete(
  "/:id",
  requirePermission("payroll:salary-structures:delete"),
  controller.deleteSalaryStructure
);
router.get(
  "/employee/:employeeId",
  requirePermission("payroll:salary-structures:list"),
  controller.listSalaryStructures
);
router.get(
  "/",
  requirePermission("payroll:salary-structures:list"),
  controller.listSalaryStructures
);

export default router;