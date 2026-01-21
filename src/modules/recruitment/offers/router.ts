import express from "express";
import { validate } from "../../../middlewares/validate.js";
import { requirePermission } from "../../../middlewares/requireRole.js";
import { CreateOfferSchema, UpdateOfferSchema } from "./schema.js";
import * as controller from "./controller.js";

const router = express.Router();

router.post("/", requirePermission("recruitment:offers:create"), validate(CreateOfferSchema), controller.createOffer);
router.get("/:id", requirePermission("recruitment:offers:read"), controller.getOffer);
router.patch("/:id", requirePermission("recruitment:offers:update"), validate(UpdateOfferSchema), controller.updateOffer);
router.delete("/:id", requirePermission("recruitment:offers:delete"), controller.deleteOffer);
router.post("/:id/accept", requirePermission("recruitment:offers:accept"), controller.acceptOffer);

export default router;