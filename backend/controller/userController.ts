import type { Request, Response } from "express";
import { getUserProfile } from "../service/ownerService.js";

export async function getUserProfileController(req: Request, res: Response) {
  try {
    const authUser = (req as any).user;
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profileData = await getUserProfile(authUser.id);
    return res.json({ data: profileData });
  } catch (error: any) {
    console.error("Get user profile error:", error);
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
