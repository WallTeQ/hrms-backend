import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { UpdateKpiSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/:id", controller.getKpi);
router.patch("/:id", validate(UpdateKpiSchema), controller.updateKpi);
router.delete("/:id", controller.deleteKpi);

export default router;