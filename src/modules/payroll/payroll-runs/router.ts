import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreatePayrollRunSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/", validate(CreatePayrollRunSchema), controller.createRun);
router.get("/", controller.listRuns);
router.get("/:id", controller.getRun);
router.patch("/:id", controller.updateRun);
router.delete("/:id", controller.deleteRun);

export default router;