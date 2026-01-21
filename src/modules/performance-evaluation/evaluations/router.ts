import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { UpdateEvaluationSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/:id", controller.getEvaluation);
router.patch("/:id", validate(UpdateEvaluationSchema), controller.updateEvaluation);
router.delete("/:id", controller.deleteEvaluation);

export default router;