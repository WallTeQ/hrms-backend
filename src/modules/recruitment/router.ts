import express from "express";
import vacanciesRouter from "./vacancies/router.js";
import applicationsRouter from "./applications/router.js";
import interviewsRouter from "./interviews/router.js";
import offersRouter from "./offers/router.js";
import * as controller from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";


const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Public top-level vacancy listings
router.get("/vacancies", controller.listVacancies);
router.get("/vacancies/:id", controller.getVacancy);

// Applications should be public so candidates can apply without signing up
router.use("/applications", applicationsRouter);

router.use("/vacancies", vacanciesRouter);
router.use("/interviews", interviewsRouter);
router.use("/offers", offersRouter);

export default router;