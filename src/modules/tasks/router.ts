import express from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requireRole.js";
import { CreateTaskSchema, UpdateTaskSchema } from "./schema.js";
import * as controller from "./controller.js";
import { upload } from "../../middlewares/multer.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requirePermission("tasks:create"), validate(CreateTaskSchema), controller.createTask);
// department head: list current tasks in their department (paginated, limited fields)
router.get("/department", requirePermission("tasks:list"), controller.listDepartmentTasks);
// department / admin scoped listing for a specific employee
router.get("/employee/:employeeId", requirePermission("tasks:list"), controller.listTasksForEmployee);
router.get("/my", requirePermission("tasks:list"), controller.listMyTasks);
router.get("/:id", requirePermission("tasks:read"), controller.getTask);
router.patch("/:id", upload.single("attachment"), validate(UpdateTaskSchema), controller.updateTask);
router.post("/:id/approve", requirePermission("tasks:approve"), controller.approveTask);
router.delete("/:id", requirePermission("tasks:delete"), controller.deleteTask);

export default router;
