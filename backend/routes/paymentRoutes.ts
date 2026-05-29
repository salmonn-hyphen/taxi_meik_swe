import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  submitPayment,
  getBookingPayments,
  getDriverPayments,
  getOwnerPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
} from "../controller/paymentController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paymentUploadDir = path.resolve(__dirname, "../uploads/payments");
fs.mkdirSync(paymentUploadDir, { recursive: true });

const paymentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentUploadDir),
    filename: (_req, file, cb) => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
      cb(null, `${uniqueId}_${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.post("/bookings/:id/payments", paymentUpload.single("screenshot"), submitPayment);
router.get("/bookings/:id/payments", getBookingPayments);
router.get("/driver/payments", getDriverPayments);
router.get("/owner/payments", getOwnerPayments);

// Admin routes
router.get("/admin/payments/pending", getPendingPayments);
router.post("/admin/payments/:id/confirm", confirmPayment);
router.post("/admin/payments/:id/reject", rejectPayment);

export default router;
export { paymentUpload };
