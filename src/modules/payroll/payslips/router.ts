import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreatePayslipSchema } from "./schema";
import * as controller from "./controller";
import { upload } from "../../../middlewares/multer";

const router = express.Router();

// Accept optional file 'file' for payslip PDF
router.post("/", upload.single("file"), validate(CreatePayslipSchema), controller.createPayslip);
router.get("/employee/:employeeId", controller.listPayslipsForEmployee);
router.get("/:id", controller.getPayslip);
router.patch("/:id", controller.updatePayslip);
router.delete("/:id", controller.deletePayslip);

export default router;