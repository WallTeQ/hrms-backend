import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreatePayslipSchema } from "./schema.js";
import * as controller from "./controller.js";
import { upload } from "../../../middlewares/multer.js";
import { requirePermission } from "../../../middlewares/requireRole.js";

const router = express.Router();

// Accept optional file 'file' for payslip PDF
router.post("/", upload.single("file"), validate(CreatePayslipSchema), controller.createPayslip);
// List all payslips (paginated)
router.get("/", controller.listPayslips);
router.get("/employee/:employeeId", controller.listPayslipsForEmployee);
router.get("/:id", controller.getPayslip);
router.patch("/:id", controller.updatePayslip);
router.post("/:id/approve", requirePermission("payroll:payslips:approve"), controller.approvePayslip);
router.delete("/:id", controller.deletePayslip);

export default router;