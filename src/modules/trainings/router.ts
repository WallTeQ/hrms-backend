import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import * as controller from "./controller.js";
import { CreateTrainingSchema, UpdateTrainingSchema } from "./schema.js";
import { UpdateSkillSchema } from "./skills/schema.js";
import { validate } from "../../middlewares/validate.js";

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.post("/", requirePermission("trainings:create"), validate(CreateTrainingSchema), controller.createTraining);
router.get("/", requirePermission("trainings:list"), controller.listTrainings);
router.get("/:id", requirePermission("trainings:read"), controller.getTraining);
router.patch("/:id", requirePermission("trainings:update"), validate(UpdateTrainingSchema), controller.updateTraining);
router.delete("/:id", requirePermission("trainings:delete"), controller.deleteTraining);

// Skills
router.post("/skills", requirePermission("trainings:skills:create"), controller.createSkill);
router.get("/skills", requirePermission("trainings:skills:list"), controller.listSkills);
router.get("/skills/:id", requirePermission("trainings:skills:read"), controller.getSkill);
router.patch("/skills/:id", requirePermission("trainings:skills:update"), validate(UpdateSkillSchema), controller.updateSkill);
router.delete("/skills/:id", requirePermission("trainings:skills:delete"), controller.deleteSkill);

export default router;