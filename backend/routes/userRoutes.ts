import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getUserProfileController } from "../controller/userController.js";

const router = Router();

router.get("/profile", authMiddleware, getUserProfileController);

export default router;
