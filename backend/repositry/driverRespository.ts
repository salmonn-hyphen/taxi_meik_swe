import prisma from "../src/lib/prisma.js";

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({
    where: { phone },
  });
}

export async function updateDriverProfile(userId: string, updateData: any) {
  return prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

export async function findDriverProfileByUserId(userId: string) {
  return prisma.driverProfile.findUnique({
    where: { userId },
  });
}

export async function submitKYCDocuments(
  driverId: string,
  urls: {
    nrcFrontUrl: string;
    nrcBackUrl: string;
    selfieUrl: string;
    drivingLicenseFrontUrl: string;
    drivingLicenseBackUrl: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const driverProfile = await tx.driverProfile.upsert({
      where: { userId: driverId },
      create: {
        userId: driverId,
        nrcText: "",
        nrcFrontImage: urls.nrcFrontUrl,
        nrcBackImage: urls.nrcBackUrl,
        driverLicenseImage: urls.drivingLicenseFrontUrl,
        nrcFrontUrl: urls.nrcFrontUrl,
        nrcBackUrl: urls.nrcBackUrl,
        selfieUrl: urls.selfieUrl,
        drivingLicenseUrl: urls.drivingLicenseFrontUrl,
        drivingLicenseFrontUrl: urls.drivingLicenseFrontUrl,
        drivingLicenseBackUrl: urls.drivingLicenseBackUrl,
        kycStatus: "SUBMITTED",
        adminApprovalStatus: "PENDING",
        approvedAt: null,
      },
      update: {
        nrcFrontImage: urls.nrcFrontUrl,
        nrcBackImage: urls.nrcBackUrl,
        driverLicenseImage: urls.drivingLicenseFrontUrl,
        nrcFrontUrl: urls.nrcFrontUrl,
        nrcBackUrl: urls.nrcBackUrl,
        selfieUrl: urls.selfieUrl,
        drivingLicenseUrl: urls.drivingLicenseFrontUrl,
        drivingLicenseFrontUrl: urls.drivingLicenseFrontUrl,
        drivingLicenseBackUrl: urls.drivingLicenseBackUrl,
        kycStatus: "SUBMITTED",
        adminApprovalStatus: "PENDING",
        approvedAt: null,
      },
    });

    await tx.user.update({
      where: { id: driverId },
      data: {
        verificationStatus: "PENDING",
        isVerified: false,
      },
    });

    return driverProfile;
  });
}

export async function getPendingKYCDrivers() {
  return prisma.driverProfile.findMany({
    where: { kycStatus: "SUBMITTED" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateDriverKYCStatus(
  driverProfileId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  return prisma.$transaction(async (tx) => {
    const driverProfile = await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        kycStatus: status,
        adminApprovalStatus: status,
        approvedAt: status === "APPROVED" ? new Date() : null,
        ...(rejectionReason ? { nrcText: rejectionReason } : {}),
      },
    });

    await tx.user.update({
      where: { id: driverProfile.userId },
      data: {
        verificationStatus: status,
        isVerified: status === "APPROVED",
      },
    });

    return driverProfile;
  });
}

export async function getKYCHistoryDrivers() {
  return prisma.driverProfile.findMany({
    where: { kycStatus: { in: ["APPROVED", "REJECTED"] } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
