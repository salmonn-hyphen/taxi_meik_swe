import { findUserByPhone, updateDriverProfile, findDriverProfileByUserId, submitKYCDocuments } from "../repositry/driverRespository.js";
import { hashPassword } from "better-auth/crypto";

export async function updateProfile(userId: string, data: { name: string; phone: string; password?: string; address?: string; bio?: string }) {
  // Check if phone number is already registered by another account
  const existingUser = await findUserByPhone(data.phone);
  if (existingUser && existingUser.id !== userId) {
    throw new Error("Phone number is already in use by another account");
  }

  const updateData: any = {
    name: data.name,
    phone: data.phone,
  };

  if (data.address !== undefined) {
    updateData.address = data.address;
  }
  if (data.bio !== undefined) {
    updateData.bio = data.bio;
  }

  if (data.password && data.password.trim() !== "") {
    updateData.passwordHash = await hashPassword(data.password);
  }

  return updateDriverProfile(userId, updateData);
}

// Generate a publicly accessible URL for a file saved to disk by multer diskStorage.
// `file.filename` is set by diskStorage (e.g. "1748393912345-abc123_nrcFront.png").
// The static route /uploads/kyc is served by Express in index.ts.
function getFileUrl(file: any): string {
  const filename = file.filename as string;
  const BASE_URL = process.env.BACKEND_URL || "http://localhost:3000";
  return `${BASE_URL}/uploads/kyc/${filename}`;
}

export async function getDriverKyc(userId: string) {
  return findDriverProfileByUserId(userId);
}

export async function submitKyc(
  userId: string,
  files: {
    nrcFront?: any;
    nrcBack?: any;
    selfie?: any;
    drivingLicenseFront?: any;
    drivingLicenseBack?: any;
  }
) {
  const { nrcFront, nrcBack, selfie, drivingLicenseFront, drivingLicenseBack } = files;
  if (!nrcFront || !nrcBack || !selfie || !drivingLicenseFront || !drivingLicenseBack) {
    throw new Error("Missing required KYC documents");
  }

  // Files are already saved to disk by multer diskStorage — just resolve their URLs
  const nrcFrontUrl = getFileUrl(nrcFront);
  const nrcBackUrl = getFileUrl(nrcBack);
  const selfieUrl = getFileUrl(selfie);
  const drivingLicenseFrontUrl = getFileUrl(drivingLicenseFront);
  const drivingLicenseBackUrl = getFileUrl(drivingLicenseBack);

  return submitKYCDocuments(userId, {
    nrcFrontUrl,
    nrcBackUrl,
    selfieUrl,
    drivingLicenseFrontUrl,
    drivingLicenseBackUrl,
  });
}
