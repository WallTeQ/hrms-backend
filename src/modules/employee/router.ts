import express from "express";
import { validate } from "../../middlewares/validate";
import { CreateEmployeeSchema, UpdateEmployeeSchema } from "./schema";
import * as controller from "./controller";

// subrouters
import contractsRouter from "./contracts/router";
import documentsRouter from "./documents/router";
import disciplinaryRecordsRouter from "./disciplinary-records/router";

const router = express.Router();

router.post("/", validate(CreateEmployeeSchema), controller.createEmployee);
router.get("/", controller.listEmployees);
router.get("/:id", controller.getEmployee);
router.patch("/:id", validate(UpdateEmployeeSchema), controller.updateEmployee);
router.delete("/:id", controller.deleteEmployee);

router.use("/:employeeId/contracts", contractsRouter);
router.use("/:employeeId/documents", documentsRouter);
router.use("/:employeeId/disciplinary-records", disciplinaryRecordsRouter);

export default router;