import express from "express";
import vacanciesRouter from "./vacancies/router";
import applicationsRouter from "./applications/router";
import interviewsRouter from "./interviews/router";
import offersRouter from "./offers/router";
import * as controller from "./controller";

const router = express.Router();

router.get("/vacancies", controller.listVacancies);
router.post("/vacancies", controller.createVacancy);
router.get("/vacancies/:id", controller.getVacancy);

router.use("/vacancies", vacanciesRouter);
router.use("/applications", applicationsRouter);
router.use("/interviews", interviewsRouter);
router.use("/offers", offersRouter);

export default router;