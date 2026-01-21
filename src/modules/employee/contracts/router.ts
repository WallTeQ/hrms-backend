import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreateContractSchema } from "./schema.js";
import * as controller from "./controller.js";
import { upload } from "../../../middlewares/multer.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { attachEmployeeId, ensureSelfOrPermission } from "../../../middlewares/employeeAccess.js";

const router = express.Router({ mergeParams: true });

// Accept multipart/form-data with optional file 'file'
router.post("/", upload.single("file"), attachEmployeeId, ensureSelfOrPermission, requirePermission("employees:contracts:create"), validate(CreateContractSchema), controller.createContract);
router.get("/", ensureSelfOrPermission, controller.listContractsForEmployee);
// Admin endpoint: list failed uploads
router.get("/failed", requirePermission("users:list"), controller.listFailedUploads);
// Retry upload (admin) — multipart with file field 'file'
router.post("/:id/retry-upload", upload.single("file"), ensureSelfOrPermission, requirePermission("users:update"), controller.retryUpload);
router.get("/:id", ensureSelfOrPermission, controller.getContract);
router.patch("/:id", ensureSelfOrPermission, controller.updateContract);
router.delete("/:id", ensureSelfOrPermission, requirePermission("employees:contracts:delete"), controller.deleteContract);

export default router;