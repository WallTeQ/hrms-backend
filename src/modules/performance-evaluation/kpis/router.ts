import express from "express";
import { validate } from "../../../middlewares/validate";
import { UpdateKpiSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.get("/:id", controller.getKpi);
router.patch("/:id", validate(UpdateKpiSchema), controller.updateKpi);
router.delete("/:id", controller.deleteKpi);

export default router;