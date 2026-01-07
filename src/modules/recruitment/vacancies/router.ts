import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateVacancySchema, UpdateVacancySchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/", validate(CreateVacancySchema), controller.createVacancy);
router.get("/", controller.listVacancies);
router.get("/:id", controller.getVacancy);
router.patch("/:id", validate(UpdateVacancySchema), controller.updateVacancy);
router.delete("/:id", controller.deleteVacancy);

export default router;