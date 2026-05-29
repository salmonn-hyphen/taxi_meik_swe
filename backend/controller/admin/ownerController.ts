import type { Request, Response } from "express";
import {
  getPendingOwnerVerifications,
  verifyOwner,
  getAdminOwnerDocuments,
} from "../../service/ownerService.js";

export async function getPendingOwnerVerificationsController(req: Request, res: Response) {
  try {
    const admin = (req as any).user;
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    if (admin.role !== "ADMIN") return res.status(403).json({ error: "Forbidden: Admins only" });

    const owners = await getPendingOwnerVerifications();
    return res.json({ data: owners });
  } catch (error: any) {
    console.error("Get pending owner verifications error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyOwnerController(req: Request, res: Response) {
  try {
    const admin = (req as any).user;
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    if (admin.role !== "ADMIN") return res.status(403).json({ error: "Forbidden: Admins only" });

    const userId = req.params.userId as string;
    const { status, notes } = req.body;

    const updatedOwner = await verifyOwner(userId, status, notes);
    return res.json({ data: updatedOwner });
  } catch (error: any) {
    console.error("Verify owner error:", error);
    if (
      error.message === "Status must be verified, approved, or rejected" ||
      error.message === "Owner must submit NRC front and NRC back before approval"
    ) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Owner not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAdminOwnerDocumentsController(req: Request, res: Response) {
  try {
    const admin = (req as any).user;
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    if (admin.role !== "ADMIN") return res.status(403).json({ error: "Forbidden: Admins only" });

    const userId = req.params.userId as string;
    const ownerProfile = await getAdminOwnerDocuments(userId);
    return res.json({ data: ownerProfile });
  } catch (error: any) {
    console.error("Get admin owner documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

