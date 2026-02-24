import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { UpdateKpiSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/:id", controller.getKpi);
router.patch("/:id", requirePermission("performance:kpis:update"), validate(UpdateKpiSchema), controller.updateKpi);
router.delete("/:id", requirePermission("performance:kpis:delete"), controller.deleteKpi);

export default router;