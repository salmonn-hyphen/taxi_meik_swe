import crypto from "crypto";
import {
  findUserById,
  findOwnerByUserId,
  createOwnerProfile,
  upsertOwnerProfile,
  updateUser,
  findOwnerProfileByUserId,
  getPendingOwners,
  findOwnerUserById,
  verifyOwnerTransaction,
} from "../repositry/ownerRespository.js";

const OWNER_KYC_TYPES = new Set(["nrc_front", "nrc_back"]);

export function toUserVerificationStatus(status?: string | null) {
  if (status === "APPROVED") return "verified";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

export function serializeOwnerDocuments(ownerProfile: any) {
  if (!ownerProfile) return [];

  const status = ownerProfile.adminApprovalStatus === "APPROVED"
    ? "approved"
    : ownerProfile.adminApprovalStatus === "REJECTED"
      ? "rejected"
      : "pending";

  const uploadedAt = ownerProfile.updatedAt?.toISOString?.() || ownerProfile.updatedAt;
  const reviewedAt = ownerProfile.approvedAt?.toISOString?.() || null;

  return [
    {
      id: `${ownerProfile.id}:nrc_front`,
      owner_profile_id: ownerProfile.id,
      type: "nrc_front",
      file_path: ownerProfile.nrcFrontImage,
      file_url: ownerProfile.nrcFrontImage,
      status: ownerProfile.nrcFrontImage ? status : "not_uploaded",
      admin_notes: null,
      uploaded_at: uploadedAt,
      reviewed_at: reviewedAt,
    },
    {
      id: `${ownerProfile.id}:nrc_back`,
      owner_profile_id: ownerProfile.id,
      type: "nrc_back",
      file_path: ownerProfile.nrcBackImage,
      file_url: ownerProfile.nrcBackImage,
      status: ownerProfile.nrcBackImage ? status : "not_uploaded",
      admin_notes: null,
      uploaded_at: uploadedAt,
      reviewed_at: reviewedAt,
    },
  ];
}

export function serializeUser(user: any) {
  const ownerApprovalStatus = user.role === "OWNER" ? user.ownerProfile?.adminApprovalStatus : null;
  const driverKycStatus = user.role === "DRIVER" ? user.driverProfile?.kycStatus : null;
  const verificationStatus =
    ownerApprovalStatus === "APPROVED" || ownerApprovalStatus === "REJECTED"
      ? ownerApprovalStatus
      : driverKycStatus === "APPROVED" || driverKycStatus === "REJECTED" || driverKycStatus === "SUBMITTED"
        ? driverKycStatus
        : user.verificationStatus;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    email_verified_at: user.emailVerified ? user.updatedAt.toISOString() : null,
    verification_status: toUserVerificationStatus(verificationStatus),
    suspension_reason: null,
    profile_photo_url: user.profilePhoto || null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
    owner_documents: serializeOwnerDocuments(user.ownerProfile),
  };
}

export function serializeOwnerProfile(ownerProfile: any, user?: any) {
  if (!ownerProfile) return null;

  return {
    id: ownerProfile.id,
    user_id: ownerProfile.userId,
    nrc_text: ownerProfile.nrcText,
    nrc_number: ownerProfile.nrcText,
    nrc_front_image: ownerProfile.nrcFrontImage,
    nrc_back_image: ownerProfile.nrcBackImage,
    address: ownerProfile.address || user?.address || "",
    city: user?.city || "",
    township: user?.township || "",
    admin_approval_status: ownerProfile.adminApprovalStatus,
    approved_at: ownerProfile.approvedAt?.toISOString?.() || null,
    created_at: ownerProfile.createdAt.toISOString(),
    updated_at: ownerProfile.updatedAt.toISOString(),
    user: user ? serializeUser({ ...user, ownerProfile }) : undefined,
  };
}

export function isApprovedOwner(user: any) {
  return user.role === "OWNER" && (
    user.isVerified ||
    user.verificationStatus === "APPROVED" ||
    user.ownerProfile?.adminApprovalStatus === "APPROVED"
  );
}

// 1. GET /api/user/profile
export async function getUserProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return serializeUser(user);
}

// 2. GET /api/owner/profile
export async function getOwnerProfile(userId: string) {
  const owner = await findOwnerByUserId(userId);
  if (!owner) {
    throw new Error("Owner not found");
  }

  let ownerProfile = owner.ownerProfile;
  if (!ownerProfile) {
    ownerProfile = await createOwnerProfile({
      id: crypto.randomUUID(),
      userId: owner.id,
      address: owner.address,
      nrcText: owner.nrcNumber || "",
      nrcFrontImage: "",
      nrcBackImage: "",
      adminApprovalStatus: "PENDING",
    });
  }

  return serializeOwnerProfile(ownerProfile, owner);
}

// 3. PUT /api/owner/profile
export async function updateOwnerProfile(userId: string, nrcText: string, address: string | null) {
  const ownerProfile = await upsertOwnerProfile(
    userId,
    {
      id: crypto.randomUUID(),
      userId,
      address,
      nrcText,
      nrcFrontImage: "",
      nrcBackImage: "",
      adminApprovalStatus: "PENDING",
    },
    {
      address,
      nrcText,
      adminApprovalStatus: "PENDING",
      approvedAt: null,
    }
  );

  const updatedUser = await updateUser(userId, {
    nrcNumber: nrcText || null,
    address,
    verificationStatus: "PENDING",
    isVerified: false,
  });

  return serializeOwnerProfile(ownerProfile, updatedUser);
}

// 4. GET /api/owner/documents
export async function getOwnerDocuments(userId: string) {
  const ownerProfile = await findOwnerProfileByUserId(userId);
  return serializeOwnerDocuments(ownerProfile);
}

// 5. POST /api/owner/documents
export async function uploadOwnerDocument(userId: string, type: string, fileData: string, fileSize?: number) {
  if (!OWNER_KYC_TYPES.has(type)) {
    throw new Error("Unsupported owner KYC document type");
  }

  if (!fileData || typeof fileData !== "string" || !fileData.startsWith("data:")) {
    throw new Error("Document file data is required");
  }

  if (typeof fileSize === "number" && fileSize > 5 * 1024 * 1024) {
    throw new Error("Document file must be smaller than 5MB");
  }

  const ownerProfile = await upsertOwnerProfile(
    userId,
    {
      id: crypto.randomUUID(),
      userId,
      nrcText: "",
      nrcFrontImage: type === "nrc_front" ? fileData : "",
      nrcBackImage: type === "nrc_back" ? fileData : "",
      adminApprovalStatus: "PENDING",
    },
    {
      ...(type === "nrc_front" ? { nrcFrontImage: fileData } : {}),
      ...(type === "nrc_back" ? { nrcBackImage: fileData } : {}),
      adminApprovalStatus: "PENDING",
      approvedAt: null,
    }
  );

  await updateUser(userId, {
    verificationStatus: "PENDING",
    isVerified: false,
  });

  const documents = serializeOwnerDocuments(ownerProfile);
  const document = documents.find((item: any) => item.type === type);
  if (!document) {
    throw new Error("Document upload failed");
  }
  return document;
}

// 6. GET /api/admin/verifications/owners
export async function getPendingOwnerVerifications() {
  const owners = await getPendingOwners();
  return owners.map(serializeUser);
}

// 7. POST /api/admin/verifications/owners/:userId
export async function verifyOwner(userId: string, status: string, notes?: string) {
  const nextStatus = status === "verified" || status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : null;
  if (!nextStatus) {
    throw new Error("Status must be verified, approved, or rejected");
  }

  const owner = await findOwnerUserById(userId);
  if (!owner) {
    throw new Error("Owner not found");
  }

  const hasRequiredDocuments = !!owner.ownerProfile?.nrcFrontImage && !!owner.ownerProfile?.nrcBackImage;
  if (nextStatus === "APPROVED" && !hasRequiredDocuments) {
    throw new Error("Owner must submit NRC front and NRC back before approval");
  }

  const updatedOwner = await verifyOwnerTransaction(userId, nextStatus);
  return serializeUser(updatedOwner);
}

// 8. GET /api/admin/users/:userId/owner-documents
export async function getAdminOwnerDocuments(userId: string) {
  const ownerProfile = await findOwnerProfileByUserId(userId);
  return serializeOwnerDocuments(ownerProfile);
}
