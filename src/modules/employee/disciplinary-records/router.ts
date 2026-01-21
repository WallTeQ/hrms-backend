import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { CreateDisciplinaryRecordSchema, UpdateDisciplinaryRecordSchema } from "./schema.js";
import * as controller from "./controller.js";
import { attachEmployeeId, ensureSelfOrPermission } from "../../../middlewares/employeeAccess.js";

const router = express.Router({ mergeParams: true });

router.post("/", attachEmployeeId, ensureSelfOrPermission, validate(CreateDisciplinaryRecordSchema), controller.createRecord);
router.get("/", controller.listForEmployee);
router.get("/:id", controller.getRecord);
router.patch("/:id", validate(UpdateDisciplinaryRecordSchema), controller.updateRecord);
router.delete("/:id", controller.deleteRecord);

export default router;