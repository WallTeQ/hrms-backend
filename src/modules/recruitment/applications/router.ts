import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateApplicationSchema, UpdateApplicationSchema } from "./schema";
import * as controller from "./controller";
import { upload } from "../../../middlewares/multer";

const router = express.Router();

// Accept optional resume file in field 'file'
router.post("/", upload.single("file"), validate(CreateApplicationSchema), controller.createApplication);
router.get("/vacancy/:vacancyId", controller.listApplicationsForVacancy);
router.get("/:id", controller.getApplication);
router.patch("/:id", validate(UpdateApplicationSchema), controller.updateApplication);
router.delete("/:id", controller.deleteApplication);

export default router;