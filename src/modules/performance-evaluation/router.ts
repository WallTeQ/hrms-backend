import express from "express";
import kpisRouter from "./kpis/router";
import evaluationsRouter from "./evaluations/router";
import * as controller from "./controller";

const router = express.Router();

router.get("/", controller.head);
router.get("/kpis", controller.listKpis);
router.post("/kpis", controller.createKpi);

router.use("/kpis", kpisRouter);
router.use("/evaluations", evaluationsRouter);

export default router;