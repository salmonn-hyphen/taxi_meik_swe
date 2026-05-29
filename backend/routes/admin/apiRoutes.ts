import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import {
  getPendingVerifications,
  getKYCHistoryController,
  reviewDriverKYCController,
} from "../../controller/admin/adminController.js";
import {
  getPendingOwnerVerificationsController,
  verifyOwnerController,
  getAdminOwnerDocumentsController,
} from "../../controller/admin/ownerController.js";

const router = Router();

// GET /api/admin/verifications/drivers/history — MUST be registered BEFORE the :id route
router.get("/verifications/drivers/history", authMiddleware, getKYCHistoryController);

// GET /api/admin/verifications/drivers — list all SUBMITTED KYC drivers
router.get("/verifications/drivers", authMiddleware, getPendingVerifications);

// PUT /api/admin/verifications/drivers/:id — approve or reject a driver KYC
router.put("/verifications/drivers/:id", authMiddleware, reviewDriverKYCController);

// GET /api/admin/verifications/owners — list all pending owner verifications
router.get("/verifications/owners", authMiddleware, getPendingOwnerVerificationsController);

// POST /api/admin/verifications/owners/:userId — verify (approve/reject) an owner
router.post("/verifications/owners/:userId", authMiddleware, verifyOwnerController);

// GET /api/admin/users/:userId/owner-documents — view owner's documents
router.get("/users/:userId/owner-documents", authMiddleware, getAdminOwnerDocumentsController);

export default router;

