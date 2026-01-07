import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateDocumentSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router({ mergeParams: true });

import { upload } from "../../../middlewares/multer";

// Expect multipart/form-data with a file field named 'file'
router.post("/", upload.single("file"), validate(CreateDocumentSchema), controller.uploadDocument);
router.get("/", controller.listDocumentsForEmployee);
router.get("/expiring", controller.listExpiring);
// GET document will redirect to Cloudinary file URL if present
router.get("/:id", controller.getDocument);
router.delete("/:id", controller.deleteDocument);

export default router;