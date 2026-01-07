import express from "express";
import { validate } from "../../../middlewares/validate";
import { UpdateEvaluationSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.get("/:id", controller.getEvaluation);
router.patch("/:id", validate(UpdateEvaluationSchema), controller.updateEvaluation);
router.delete("/:id", controller.deleteEvaluation);

export default router;