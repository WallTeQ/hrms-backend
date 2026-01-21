import express from "express";
import { validate } from "../../../middlewares/validate.js";
import * as controller from "./controller.js";
import { requirePermission } from "../../../middlewares/requireRole.js";

const router = express.Router();

router.post("/", requirePermission("performance:promotions:create"), controller.promote);

export default router;