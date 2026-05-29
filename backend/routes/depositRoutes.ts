import { Router } from "express";
import { paymentUpload } from "./paymentRoutes.js";
import {
  submitDeposit,
  getBookingDeposits,
  getDriverDeposits,
  getOwnerDeposits,
  freezeDeposit,
  releaseDeposit,
  deductDeposit,
} from "../controller/depositController.js";

const router = Router();

router.post("/bookings/:id/deposits", paymentUpload.single("screenshot"), submitDeposit);
router.get("/bookings/:id/deposits", getBookingDeposits);
router.get("/driver/deposits", getDriverDeposits);
router.get("/owner/deposits", getOwnerDeposits);

// Admin routes
router.post("/admin/deposits/:id/freeze", freezeDeposit);
router.post("/admin/deposits/:id/release", releaseDeposit);
router.post("/admin/deposits/:id/deduct", deductDeposit);

export default router;
