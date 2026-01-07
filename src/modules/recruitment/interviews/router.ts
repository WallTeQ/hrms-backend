import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateInterviewSchema, UpdateInterviewSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/", validate(CreateInterviewSchema), controller.schedule);
router.get("/:id", controller.getInterview);
router.patch("/:id", validate(UpdateInterviewSchema), controller.updateInterview);
router.delete("/:id", controller.deleteInterview);

export default router;