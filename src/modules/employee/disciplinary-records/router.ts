import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateDisciplinaryRecordSchema, UpdateDisciplinaryRecordSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router({ mergeParams: true });

router.post("/", validate(CreateDisciplinaryRecordSchema), controller.createRecord);
router.get("/", controller.listForEmployee);
router.get("/:id", controller.getRecord);
router.patch("/:id", validate(UpdateDisciplinaryRecordSchema), controller.updateRecord);
router.delete("/:id", controller.deleteRecord);

export default router;