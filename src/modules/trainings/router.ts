import express from "express";
import * as controller from "./controller";
import { CreateTrainingSchema, UpdateTrainingSchema } from "./schema";
import { UpdateSkillSchema } from "./skills/schema";
import { validate } from "../../middlewares/validate";

const router = express.Router();

router.post("/", validate(CreateTrainingSchema), controller.createTraining);
router.get("/", controller.listTrainings);
router.get("/:id", controller.getTraining);
router.patch("/:id", validate(UpdateTrainingSchema), controller.updateTraining);
router.delete("/:id", controller.deleteTraining);

// Skills
router.post("/skills", controller.createSkill);
router.get("/skills", controller.listSkills);
router.get("/skills/:id", controller.getSkill);
router.patch("/skills/:id", validate(UpdateSkillSchema), controller.updateSkill);
router.delete("/skills/:id", controller.deleteSkill);

export default router;