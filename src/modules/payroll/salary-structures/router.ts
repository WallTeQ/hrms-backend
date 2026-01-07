import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateSalaryStructureSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/", validate(CreateSalaryStructureSchema), controller.createSalaryStructure);
router.patch("/:id", controller.updateSalaryStructure);
router.delete("/:id", controller.deleteSalaryStructure);
router.get("/", controller.listSalaryStructures);

export default router;