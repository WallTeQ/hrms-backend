import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { LeaveBalanceSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.get("/employee/:employeeId", requirePermission("leave:balance:read"), controller.getLeaveBalance);
router.get("/", requirePermission("leave:balance:list"), controller.listLeaveBalances);
router.post("/", requirePermission("leave:balance:update"), validate(LeaveBalanceSchema), controller.upsertLeaveBalance);
router.delete("/:id", requirePermission("leave:balance:delete"), controller.deleteLeaveBalance);


export default router;
