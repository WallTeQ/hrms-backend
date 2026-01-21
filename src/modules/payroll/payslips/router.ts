import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreatePayslipSchema } from "./schema.js";
import * as controller from "./controller.js";
import { upload } from "../../../middlewares/multer.js";

const router = express.Router();

// Accept optional file 'file' for payslip PDF
router.post("/", upload.single("file"), validate(CreatePayslipSchema), controller.createPayslip);
router.get("/employee/:employeeId", controller.listPayslipsForEmployee);
router.get("/:id", controller.getPayslip);
router.patch("/:id", controller.updatePayslip);
router.delete("/:id", controller.deletePayslip);

export default router;