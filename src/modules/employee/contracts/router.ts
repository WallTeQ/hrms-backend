import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateContractSchema } from "./schema";
import * as controller from "./controller";
import { upload } from "../../../middlewares/multer";

const router = express.Router({ mergeParams: true });

// Accept multipart/form-data with optional file 'file'
router.post("/", upload.single("file"), validate(CreateContractSchema), controller.createContract);
router.get("/", controller.listContractsForEmployee);
router.get("/:id", controller.getContract);
router.patch("/:id", controller.updateContract);
router.delete("/:id", controller.deleteContract);

export default router;