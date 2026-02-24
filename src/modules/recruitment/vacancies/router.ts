import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { authMiddleware } from "../../../middlewares/auth.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { CreateVacancySchema, UpdateVacancySchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

// Protect all vacancy management routes
router.use(authMiddleware);

router.post("/", requirePermission("recruitment:vacancies:create"), validate(CreateVacancySchema), controller.createVacancy);
router.get("/", requirePermission("recruitment:vacancies:list"), controller.listVacancies);
router.get("/:id", requirePermission("recruitment:vacancies:read"), controller.getVacancy);
router.patch("/:id", requirePermission("recruitment:vacancies:update"), validate(UpdateVacancySchema), controller.updateVacancy);
router.delete("/:id", requirePermission("recruitment:vacancies:delete"), controller.deleteVacancy);

export default router;