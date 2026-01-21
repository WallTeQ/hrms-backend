import express from "express";
import * as controller from "./controller.js";
import { requirePermission } from "../../../middlewares/requireRole.js";

const router = express.Router();

router.post("/assess", requirePermission("performance:probation:assess"), controller.assess);

export default router;