import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateStatutoryDeductionSchema, UpdateStatutoryDeductionSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/", validate(CreateStatutoryDeductionSchema), controller.createStatutoryDeduction);
router.get("/", controller.listStatutoryDeductions);
router.get("/:id", controller.getStatutoryDeduction);
router.patch("/:id", validate(UpdateStatutoryDeductionSchema), controller.updateStatutoryDeduction);
router.delete("/:id", controller.deleteStatutoryDeduction);

export default router;