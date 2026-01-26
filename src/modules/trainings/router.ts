import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import * as controller from "./controller.js";
import { CreateTrainingSchema, UpdateTrainingSchema } from "./schema.js";
import { UpdateSkillSchema } from "./skills/schema.js";
import { validate } from "../../middlewares/validate.js";

const router = express.Router();

// Expose the skills list as a public (no-auth) endpoint so clients can fetch skill options without logging in
router.get("/skills", controller.listSkills);

// Apply auth middleware to the rest of the routes in this router
router.use(authMiddleware);

router.post("/", requirePermission("trainings:create"), validate(CreateTrainingSchema), controller.createTraining);
router.get("/", requirePermission("trainings:list"), controller.listTrainings);

// Skills (protected operations)
router.post("/skills", requirePermission("trainings:skills:create"), controller.createSkill);
router.get("/skills/:id", requirePermission("trainings:skills:read"), controller.getSkill);
router.patch("/skills/:id", requirePermission("trainings:skills:update"), validate(UpdateSkillSchema), controller.updateSkill);
router.delete("/skills/:id", requirePermission("trainings:skills:delete"), controller.deleteSkill);

router.get("/:id", requirePermission("trainings:read"), controller.getTraining);
router.patch("/:id", requirePermission("trainings:update"), validate(UpdateTrainingSchema), controller.updateTraining);
router.delete("/:id", requirePermission("trainings:delete"), controller.deleteTraining);

export default router;