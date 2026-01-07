import express from "express";
import { validate } from "../../../middlewares/validate";
import { CreateOfferSchema, UpdateOfferSchema } from "./schema";
import * as controller from "./controller";

const router = express.Router();

router.post("/", validate(CreateOfferSchema), controller.createOffer);
router.get("/:id", controller.getOffer);
router.patch("/:id", validate(UpdateOfferSchema), controller.updateOffer);
router.delete("/:id", controller.deleteOffer);
router.post("/:id/accept", controller.acceptOffer);

export default router;