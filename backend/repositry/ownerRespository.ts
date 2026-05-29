import { ApprovalStatus } from "../src/generated/prisma/enums.js";
import prisma from "../src/lib/prisma.js";

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { ownerProfile: true, driverProfile: true },
  });
}

export async function findOwnerByUserId(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { ownerProfile: true },
  });
}

export async function createOwnerProfile(data: {
  id: string;
  userId: string;
  address: string | null;
  nrcText: string;
  nrcFrontImage: string;
  nrcBackImage: string;
  adminApprovalStatus: ApprovalStatus;
}) {
  return prisma.ownerProfile.create({
    data,
  });
}

export async function upsertOwnerProfile(userId: string, createData: any, updateData: any) {
  return prisma.ownerProfile.upsert({
    where: { userId },
    create: createData,
    update: updateData,
  });
}

export async function updateUser(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data,
    include: { ownerProfile: true },
  });
}

export async function findOwnerProfileByUserId(userId: string) {
  return prisma.ownerProfile.findUnique({
    where: { userId },
  });
}

export async function getPendingOwners() {
  return prisma.user.findMany({
    where: {
      role: "OWNER",
      verificationStatus: "PENDING",
      ownerProfile: {
        is: {
          nrcFrontImage: { not: "" },
          nrcBackImage: { not: "" },
        },
      },
    },
    include: {
      ownerProfile: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findOwnerUserById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, role: "OWNER" },
    include: {
      ownerProfile: true,
    },
  });
}

export async function verifyOwnerTransaction(userId: string, nextStatus: "APPROVED" | "REJECTED") {
  return prisma.$transaction(async (tx) => {
    await tx.ownerProfile.updateMany({
      where: { userId },
      data: {
        adminApprovalStatus: nextStatus,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
      },
    });

    return tx.user.update({
      where: { id: userId },
      data: {
        verificationStatus: nextStatus,
        isVerified: nextStatus === "APPROVED",
      },
      include: {
        ownerProfile: true,
      },
    });
  });
}
