import { Router } from "express";
import {
  getNotifications,
  readNotification,
  readAllNotifications,
  getUnreadNotificationCount,
} from "../controller/notificationController.js";

const router = Router();

router.get("/notifications", getNotifications);
router.post("/notifications/:id/read", readNotification);
router.post("/notifications/read-all", readAllNotifications);
router.get("/notifications/unread-count", getUnreadNotificationCount);

export default router;
