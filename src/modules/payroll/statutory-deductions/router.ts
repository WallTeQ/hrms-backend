import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreateStatutoryDeductionSchema, UpdateStatutoryDeductionSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.post("/", validate(CreateStatutoryDeductionSchema), controller.createStatutoryDeduction);
router.get("/", controller.listStatutoryDeductions);
router.get("/:id", controller.getStatutoryDeduction);
router.patch("/:id", validate(UpdateStatutoryDeductionSchema), controller.updateStatutoryDeduction);
router.delete("/:id", controller.deleteStatutoryDeduction);

export default router;