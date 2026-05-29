import { Router } from "express";
import {
  createBooking,
  getDriverBookings,
  getDriverBookingById,
  getOwnerBookings,
  getOwnerBookingById,
  getAdminBookings,
  adminAcceptBooking,
  adminRejectBooking,
  adminSendAgreement,
  cancelBooking,
  ownerAcceptBooking,
  ownerRejectBooking,
} from "../controller/api/bookingController.js";

const router = Router();

// Driver routes
router.post("/driver/bookings", createBooking);
router.get("/driver/bookings", getDriverBookings);
router.get("/driver/bookings/:id", getDriverBookingById);

// Owner routes
router.get("/owner/bookings", getOwnerBookings);
router.get("/owner/bookings/:id", getOwnerBookingById);
router.post("/owner/bookings/:id/accept", ownerAcceptBooking);
router.post("/owner/bookings/:id/reject", ownerRejectBooking);

// Admin routes
router.get("/admin/bookings", getAdminBookings);
router.post("/admin/bookings/:id/accept", adminAcceptBooking);
router.post("/admin/bookings/:id/reject", adminRejectBooking);
router.post("/admin/bookings/:id/send-agreement", adminSendAgreement);

// General routes
router.post("/bookings/:id/cancel", cancelBooking);

export default router;
