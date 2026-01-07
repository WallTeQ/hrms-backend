import express from "express";
import { validate } from "../../../middlewares/validate";
import * as controller from "./controller";

const router = express.Router();

router.post("/", controller.promote);

export default router;