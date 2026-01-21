import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreateApplicationSchema, UpdateApplicationSchema } from "./schema.js";
import * as controller from "./controller.js";
import { upload } from "../../../middlewares/multer.js";

const router = express.Router();

// Accept optional resume file in field 'file'
router.post("/", upload.single("file"), validate(CreateApplicationSchema), controller.createApplication);
router.get("/vacancy/:vacancyId", controller.listApplicationsForVacancy);
router.get("/:id", controller.getApplication);
router.patch("/:id", validate(UpdateApplicationSchema), controller.updateApplication);
router.delete("/:id", controller.deleteApplication);

export default router;