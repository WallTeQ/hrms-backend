import express from "express";
import * as controller from "./controller";

const router = express.Router();

router.post("/assess", controller.assess);

export default router;