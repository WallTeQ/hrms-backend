import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import * as controller from "./controller.js";
import { CreateTrainingSchema, UpdateTrainingSchema, TrainingRecommendationQuerySchema, UpdateTrainingRecommendationSchema, TrainingGapRecommendationQuerySchema } from "./schema.js";
import { AddTrainingHistorySchema } from "./training-history/schema.js";
import { UpdateSkillSchema } from "./skills/schema.js";
import { validate, validateQuery } from "../../middlewares/validate.js";

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
router.get("/skills/:id/employees", requirePermission("trainings:skills:read"), controller.listEmployeesForSkill);
router.patch("/skills/:id", requirePermission("trainings:skills:update"), validate(UpdateSkillSchema), controller.updateSkill);
router.delete("/skills/:id", requirePermission("trainings:skills:delete"), controller.deleteSkill);

router.get("/:id", requirePermission("trainings:read"), controller.getTraining);
router.patch("/:id", requirePermission("trainings:update"), validate(UpdateTrainingSchema), controller.updateTraining);
router.delete("/:id", requirePermission("trainings:delete"), controller.deleteTraining);

router.get("/recommendations", requirePermission("trainings:recommendations:list"), validateQuery(TrainingRecommendationQuerySchema), controller.listTrainingRecommendations);
router.patch("/recommendations/:id", requirePermission("trainings:recommendations:update"), validate(UpdateTrainingRecommendationSchema), controller.updateTrainingRecommendation);
router.post("/recommendations/generate", requirePermission("trainings:recommendations:generate"), validateQuery(TrainingGapRecommendationQuerySchema), controller.generateExpertiseGapRecommendations);

router.post("/history", requirePermission("trainings:history:create"), validate(AddTrainingHistorySchema), controller.addTrainingHistory);
router.get("/history/employee/:employeeId", requirePermission("trainings:history:list"), controller.listTrainingHistoryForEmployee);
router.patch("/history/:id", requirePermission("trainings:history:update"), validate(AddTrainingHistorySchema.partial()), controller.updateTrainingHistory);
router.delete("/history/:id", requirePermission("trainings:history:delete"), controller.deleteTrainingHistory);

export default router;