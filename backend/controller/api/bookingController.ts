import type { Request, Response } from "express";
import prisma from "../../src/lib/prisma.js";
import { requireUser } from "../../src/lib/auth-helpers.js";
import {
  serializeBooking,
  serializeBookingWithFinancials,
  isApprovedOwner,
} from "../../src/lib/serializers.js";
import crypto from "crypto";

export async function createBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const carId = req.body.car_id || req.body.carId;
    const driverNotes = req.body.driver_notes || req.body.driverNotes || null;

    if (!carId || typeof carId !== "string") {
      return res.status(400).json({ error: "Car ID is required" });
    }

    const driver = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { driverProfile: true },
    });

    if (!driver || !driver.isVerified || driver.verificationStatus !== "APPROVED") {
      return res.status(403).json({ error: "Driver KYC must be approved before applying for cars" });
    }

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    if (
      !car ||
      car.adminApprovalStatus !== "APPROVED" ||
      car.availabilityStatus !== "AVAILABLE" ||
      !isApprovedOwner(car.owner)
    ) {
      return res.status(404).json({ error: "Car not found" });
    }

    if (car.ownerId === authUser.id) {
      return res.status(400).json({ error: "You cannot apply for your own car" });
    }

    const application = await prisma.$transaction(async (tx) => {
      const existing = await tx.carApplication.findUnique({
        where: { carId_driverId: { carId, driverId: authUser.id } },
      });

      return existing
        ? await tx.carApplication.update({
            where: { id: existing.id },
            data: {
              ownerApprovalStatus: "PENDING",
              adminApprovalStatus: "PENDING",
              approvedAt: null,
              agreementSentAt: null,
              wardRecommendationLetter: driverNotes,
            },
            include: {
              car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
              driver: { include: { driverProfile: true } },
              owner: { include: { ownerProfile: true } },
            },
          })
        : await tx.carApplication.create({
            data: {
              id: crypto.randomUUID(),
              ownerId: car.ownerId,
              carId,
              driverId: authUser.id,
              wardRecommendationLetter: driverNotes,
              ownerApprovalStatus: "PENDING",
              adminApprovalStatus: "PENDING",
            },
            include: {
              car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
              driver: { include: { driverProfile: true } },
              owner: { include: { ownerProfile: true } },
            },
          });
    });

    prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        receiverId: car.ownerId,
        triggerUserId: authUser.id,
        title: "New car borrow request",
        message: `${driver.name} applied to borrow your ${car.brand} ${car.model}.`,
        type: "booking_request",
        entityId: application.id,
      },
    }).catch((notificationError) => {
      console.error("Create booking request notification error:", notificationError);
    });

    return res.status(201).json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Create driver booking request error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDriverBookings(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const status = typeof req.query.status === "string" ? req.query.status : null;
    const statusMap: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = {
      requested: "PENDING",
      accepted: "APPROVED",
      active: "APPROVED",
      cancelled: "REJECTED",
    };

    const applications = await prisma.carApplication.findMany({
      where: {
        driverId: authUser.id,
        ...(status && status !== "all" && statusMap[status] ? { ownerApprovalStatus: statusMap[status] } : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = await Promise.all(applications.map(serializeBookingWithFinancials));

    return res.json({
      data,
      current_page: 1,
      per_page: applications.length,
      total: applications.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get driver bookings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDriverBookingById(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), driverId: authUser.id },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    return res.json({ data: await serializeBookingWithFinancials(application) });
  } catch (error: any) {
    console.error("Get driver booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerBookings(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const status = typeof req.query.status === "string" ? req.query.status : null;
    const statusMap: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = {
      requested: "PENDING",
      accepted: "APPROVED",
      active: "APPROVED",
      cancelled: "REJECTED",
    };

    const applications = await prisma.carApplication.findMany({
      where: {
        ownerId: authUser.id,
        ...(status && status !== "all" && statusMap[status] ? { ownerApprovalStatus: statusMap[status] } : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = await Promise.all(applications.map(serializeBookingWithFinancials));

    return res.json({
      data,
      current_page: 1,
      per_page: applications.length,
      total: applications.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get owner bookings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerBookingById(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), ownerId: authUser.id },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    return res.json({ data: await serializeBookingWithFinancials(application) });
  } catch (error: any) {
    console.error("Get owner booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAdminBookings(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const status = typeof req.query.status === "string" ? req.query.status : null;
    const statusMap: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = {
      requested: "PENDING",
      accepted: "APPROVED",
      active: "APPROVED",
      completed: "APPROVED",
      cancelled: "REJECTED",
    };

    const applications = await prisma.carApplication.findMany({
      where: {
        ownerApprovalStatus: "APPROVED",
        ...(status && status !== "all" && statusMap[status] ? { adminApprovalStatus: statusMap[status] } : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = await Promise.all(applications.map(serializeBookingWithFinancials));

    return res.json({
      data,
      current_page: 1,
      per_page: applications.length,
      total: applications.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get admin bookings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function adminAcceptBooking(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), ownerApprovalStatus: "APPROVED" },
      include: { car: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Owner-approved booking request not found" });
    }

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.carApplication.update({
        where: { id: existing.id },
        data: { adminApprovalStatus: "APPROVED" },
        include: {
          car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
          driver: { include: { driverProfile: true } },
          owner: { include: { ownerProfile: true } },
        },
      });

      await tx.notification.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            receiverId: app.ownerId,
            triggerUserId: admin.id,
            title: "Booking approved by admin",
            message: `Admin approved the booking for ${app.car.brand} ${app.car.model}.`,
            type: "booking_admin_approved",
            entityId: app.id,
          },
          {
            id: crypto.randomUUID(),
            receiverId: app.driverId,
            triggerUserId: admin.id,
            title: "Booking approved by admin",
            message: `Admin approved your booking for ${app.car.brand} ${app.car.model}.`,
            type: "booking_admin_approved",
            entityId: app.id,
          },
        ],
      });

      return app;
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Admin accept booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function adminRejectBooking(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), ownerApprovalStatus: "APPROVED" },
    });

    if (!existing) {
      return res.status(404).json({ error: "Owner-approved booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: { adminApprovalStatus: "REJECTED" },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          receiverId: application.ownerId,
          triggerUserId: admin.id,
          title: "Booking rejected by admin",
          message: req.body.reason || `Admin rejected the booking for ${application.car.brand} ${application.car.model}.`,
          type: "booking_admin_rejected",
          entityId: application.id,
        },
        {
          id: crypto.randomUUID(),
          receiverId: application.driverId,
          triggerUserId: admin.id,
          title: "Booking rejected by admin",
          message: req.body.reason || `Admin rejected your booking for ${application.car.brand} ${application.car.model}.`,
          type: "booking_admin_rejected",
          entityId: application.id,
        },
      ],
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Admin reject booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function adminSendAgreement(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), ownerApprovalStatus: "APPROVED", adminApprovalStatus: "APPROVED" },
    });

    if (!existing) {
      return res.status(404).json({ error: "Admin-approved booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: { agreementSentAt: new Date() },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          receiverId: application.ownerId,
          triggerUserId: admin.id,
          title: "Agreement form sent",
          message: `Admin sent the agreement form for ${application.car.brand} ${application.car.model}.`,
          type: "agreement_sent",
          entityId: application.id,
        },
        {
          id: crypto.randomUUID(),
          receiverId: application.driverId,
          triggerUserId: admin.id,
          title: "Agreement form sent",
          message: `Admin sent the agreement form for your ${application.car.brand} ${application.car.model} booking.`,
          type: "agreement_sent",
          entityId: application.id,
        },
      ],
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Send agreement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "OWNER", "ADMIN"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: {
        id: String(req.params.id),
        ...(authUser.role === "DRIVER"
          ? { driverId: authUser.id }
          : authUser.role === "OWNER"
            ? { ownerId: authUser.id }
            : {}),
      },
      include: { car: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: {
        ownerApprovalStatus: "REJECTED",
        adminApprovalStatus: "REJECTED",
        approvedAt: null,
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    return res.json({ data: await serializeBookingWithFinancials(application) });
  } catch (error: any) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function ownerAcceptBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: { ownerApprovalStatus: "APPROVED", approvedAt: new Date() },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        receiverId: application.driverId,
        triggerUserId: authUser.id,
        title: "Borrow request accepted",
        message: `${application.owner.name} accepted your request for ${application.car.brand} ${application.car.model}.`,
        type: "booking_accepted",
        entityId: application.id,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((adminUser) => ({
          id: crypto.randomUUID(),
          receiverId: adminUser.id,
          triggerUserId: authUser.id,
          title: "Booking request approved by owner",
          message: `${application.owner.name} approved ${application.driver.name}'s request for ${application.car.brand} ${application.car.model}.`,
          type: "booking_accepted",
          entityId: application.id,
        })),
      });
    }

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Accept booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function ownerRejectBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: String(req.params.id), ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: { ownerApprovalStatus: "REJECTED", approvedAt: null },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        receiverId: application.driverId,
        triggerUserId: authUser.id,
        title: "Borrow request rejected",
        message: req.body.reason || `${application.owner.name} rejected your request for ${application.car.brand} ${application.car.model}.`,
        type: "booking_rejected",
        entityId: application.id,
      },
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Reject booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
