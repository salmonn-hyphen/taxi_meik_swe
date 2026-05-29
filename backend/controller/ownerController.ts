import type { Request, Response } from "express";
import {
  getOwnerProfile,
  updateOwnerProfile,
  getOwnerDocuments,
  uploadOwnerDocument,
} from "../service/ownerService.js";

export async function getOwnerProfileController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "OWNER") return res.status(403).json({ error: "Forbidden: Only owners can access this resource" });

    const ownerProfileData = await getOwnerProfile(user.id);
    return res.json({ data: ownerProfileData });
  } catch (error: any) {
    console.error("Get owner profile error:", error);
    if (error.message === "Owner not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateOwnerProfileController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "OWNER") return res.status(403).json({ error: "Forbidden: Only owners can access this resource" });

    const nrcText = req.body.nrc_text || req.body.nrc_number || req.body.nrcText || "";
    const address = req.body.address || null;

    const updatedProfile = await updateOwnerProfile(user.id, nrcText, address);
    return res.json({ data: updatedProfile });
  } catch (error: any) {
    console.error("Update owner profile error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "NRC number is already registered" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerDocumentsController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "OWNER") return res.status(403).json({ error: "Forbidden: Only owners can access this resource" });

    const documents = await getOwnerDocuments(user.id);
    return res.json({ data: documents });
  } catch (error: any) {
    console.error("Get owner documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function uploadOwnerDocumentController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "OWNER") return res.status(403).json({ error: "Forbidden: Only owners can access this resource" });

    const { type, fileSize, fileData } = req.body;

    const document = await uploadOwnerDocument(user.id, type, fileData, fileSize);
    return res.json({ data: document });
  } catch (error: any) {
    console.error("Upload owner document error:", error);
    if (
      error.message === "Unsupported owner KYC document type" ||
      error.message === "Document file data is required" ||
      error.message === "Document file must be smaller than 5MB"
    ) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
