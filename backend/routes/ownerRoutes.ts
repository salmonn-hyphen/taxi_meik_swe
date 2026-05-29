import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getOwnerProfileController,
  updateOwnerProfileController,
  getOwnerDocumentsController,
  uploadOwnerDocumentController,
} from "../controller/ownerController.js";

const router = Router();

router.get("/profile", authMiddleware, getOwnerProfileController);
router.put("/profile", authMiddleware, updateOwnerProfileController);
router.get("/documents", authMiddleware, getOwnerDocumentsController);
router.post("/documents", authMiddleware, uploadOwnerDocumentController);

export default router;
