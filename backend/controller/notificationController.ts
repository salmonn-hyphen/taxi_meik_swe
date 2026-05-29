import type { Request, Response } from "express";
import prisma from "../src/lib/prisma.js";
import { requireUser } from "../src/lib/auth-helpers.js";
import { serializeNotification } from "../src/lib/serializers.js";

export async function getNotifications(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const notifications = await prisma.notification.findMany({
      where: { receiverId: authUser.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: notifications.map(serializeNotification) });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function readNotification(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await prisma.notification.updateMany({
      where: { id: String(req.params.id), receiverId: authUser.id },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function readAllNotifications(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await prisma.notification.updateMany({
      where: { receiverId: authUser.id, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUnreadNotificationCount(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const count = await prisma.notification.count({
      where: { receiverId: authUser.id, isRead: false },
    });

    return res.json({ data: count });
  } catch (error: any) {
    console.error("Get unread notification count error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
