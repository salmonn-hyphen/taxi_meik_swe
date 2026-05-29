import { Router } from "express";
import {
  getAgreements,
  getAgreementById,
  agreeAgreement,
} from "../controller/agreementController.js";

const router = Router();

router.get("/agreements", getAgreements);
router.get("/agreements/:id", getAgreementById);
router.post("/agreements/:id/agree", agreeAgreement);

export default router;
