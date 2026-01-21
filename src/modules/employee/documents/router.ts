import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreateDocumentSchema } from "./schema.js";
import * as controller from "./controller.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { attachEmployeeId, ensureSelfOrPermission } from "../../../middlewares/employeeAccess.js";

const router = express.Router({ mergeParams: true });

import { upload } from "../../../middlewares/multer.js";

// Expect multipart/form-data with a file field named 'file'
router.post("/", upload.single("file"), attachEmployeeId, ensureSelfOrPermission, requirePermission("employees:documents:create"), validate(CreateDocumentSchema), controller.uploadDocument);
router.get("/", ensureSelfOrPermission, controller.listDocumentsForEmployee);
router.get("/expiring", controller.listExpiring);
// GET document will redirect to Cloudinary file URL if present
router.get("/:id", ensureSelfOrPermission, controller.getDocument);
router.delete("/:id", ensureSelfOrPermission, requirePermission("employees:documents:delete"), controller.deleteDocument);

export default router;