import type { Request, Response } from "express";
import prisma from "../../src/lib/prisma.js";
import { requireUser } from "../../src/lib/auth-helpers.js";
import { serializeCar } from "../../src/lib/serializers.js";
import { isApprovedOwner } from "../../service/ownerService.js";
import crypto from "crypto";

export async function getPendingCarVerifications(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const cars = await prisma.car.findMany({
      where: { adminApprovalStatus: "PENDING" },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ data: cars.map(serializeCar) });
  } catch (error: any) {
    console.error("Get pending car verifications error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyCar(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const { status } = req.body;
    const nextStatus = status === "verified" || status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : null;

    if (!nextStatus) {
      return res.status(400).json({ error: "Status must be verified, approved, or rejected" });
    }

    const existing = await prisma.car.findUnique({
      where: { id: String(req.params.carId) },
      include: { owner: { include: { ownerProfile: true } } },
    }) as any;

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    if (nextStatus === "APPROVED" && !isApprovedOwner(existing.owner)) {
      return res.status(400).json({ error: "Owner KYC must be approved before approving this car" });
    }

    const car = await prisma.car.update({
      where: { id: existing.id },
      data: {
        adminApprovalStatus: nextStatus,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Verify car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerCars(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const cars = await prisma.car.findMany({
      where: { ownerId: authUser.id },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: cars.map(serializeCar) });
  } catch (error: any) {
    console.error("Get owner cars error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCarById(req: Request, res: Response) {
  try {
    const car = await prisma.car.findUnique({
      where: { id: String(req.params.carId) },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    }) as any;

    if (
      !car ||
      car.adminApprovalStatus !== "APPROVED" ||
      car.availabilityStatus !== "AVAILABLE" ||
      !isApprovedOwner(car.owner)
    ) {
      return res.status(404).json({ error: "Car not found" });
    }

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Get car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listCars(req: Request, res: Response) {
  try {
    const cars = await prisma.car.findMany({
      where: {
        adminApprovalStatus: "APPROVED",
        availabilityStatus: "AVAILABLE",
        owner: {
          OR: [
            { verificationStatus: "APPROVED" },
            {
              ownerProfile: {
                is: { adminApprovalStatus: "APPROVED" },
              },
            },
          ],
        },
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: cars.map(serializeCar),
      meta: { current_page: 1, per_page: cars.length, total: cars.length, last_page: 1 },
    });
  } catch (error: any) {
    console.error("List cars error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const owner = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { ownerProfile: true },
    });

    if (!owner || !isApprovedOwner(owner)) {
      return res.status(403).json({ error: "Owner KYC must be approved before posting cars" });
    }

    const {
      brand,
      model,
      year,
      color,
      license_number,
      license_plate,
      fuel_type,
      owner_book,
      rental_period,
      rental_payment_type,
      rental_type,
      rental_price,
      daily_rate,
      deposit_amount,
      front_image,
      back_image,
      left_image,
      right_image,
    } = req.body;

    const licenseNumber = license_number || license_plate;
    const rentalPrice = rental_price ?? daily_rate;
    const fuelTypeMap: Record<string, "PETROL" | "DIESEL" | "EV"> = {
      petrol: "PETROL",
      PETROL: "PETROL",
      diesel: "DIESEL",
      DIESEL: "DIESEL",
      electric: "EV",
      ev: "EV",
      EV: "EV",
    };
    const paymentTypeMap: Record<string, "DAILY" | "WEEKLY" | "MONTHLY"> = {
      daily: "DAILY",
      DAILY: "DAILY",
      weekly: "WEEKLY",
      WEEKLY: "WEEKLY",
      monthly: "MONTHLY",
      MONTHLY: "MONTHLY",
    };
    const rentalTypeMap: Record<string, "DRIVER_HOME" | "OWNER_HOME"> = {
      driver_home: "DRIVER_HOME",
      DRIVER_HOME: "DRIVER_HOME",
      owner_home: "OWNER_HOME",
      OWNER_HOME: "OWNER_HOME",
    };

    if (!brand || !model || !licenseNumber || !fuel_type || !owner_book || !rental_payment_type || !rental_type || !rentalPrice) {
      return res.status(400).json({ error: "Missing required car fields" });
    }

    if (!front_image || !back_image || !left_image || !right_image) {
      return res.status(400).json({ error: "Front, back, left, and right car images are required" });
    }

    const mappedFuelType = fuelTypeMap[String(fuel_type)] || fuelTypeMap[String(fuel_type).toLowerCase()];
    if (!mappedFuelType) {
      return res.status(400).json({ error: "Fuel type must be petrol, diesel, or electric" });
    }
    const mappedPaymentType = paymentTypeMap[String(rental_payment_type)] || paymentTypeMap[String(rental_payment_type).toLowerCase()];
    if (!mappedPaymentType) {
      return res.status(400).json({ error: "Rental payment type must be daily, weekly, or monthly" });
    }
    const mappedRentalType = rentalTypeMap[String(rental_type)] || rentalTypeMap[String(rental_type).toLowerCase()];
    if (!mappedRentalType) {
      return res.status(400).json({ error: "Rental type must be driver home or owner home" });
    }

    const car = await prisma.car.create({
      data: {
        id: crypto.randomUUID(),
        ownerId: owner.id,
        brand,
        model,
        year: year ? Number(year) : null,
        color: color || null,
        licenseNumber,
        fuelType: mappedFuelType,
        ownerBook: owner_book,
        rentalPeriod: rental_period || null,
        rentalPaymentType: mappedPaymentType,
        rentalType: mappedRentalType,
        rentalPrice: String(rentalPrice),
        depositAmount: String(deposit_amount || 0),
        availabilityStatus: "AVAILABLE",
        adminApprovalStatus: "PENDING",
        carImages: {
          create: {
            id: crypto.randomUUID(),
            frontImage: front_image,
            backImage: back_image,
            leftImage: left_image,
            rightImage: right_image,
          },
        },
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.status(201).json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Create car error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "License number is already used" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: String(req.params.carId), ownerId: authUser.id },
      include: { carImages: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    if (existing.adminApprovalStatus === "APPROVED") {
      return res.status(403).json({ error: "Approved cars cannot be edited" });
    }

    const {
      brand,
      model,
      year,
      color,
      license_number,
      license_plate,
      fuel_type,
      owner_book,
      rental_period,
      rental_payment_type,
      rental_type,
      rental_price,
      daily_rate,
      deposit_amount,
      front_image,
      back_image,
      left_image,
      right_image,
    } = req.body;

    const licenseNumber = license_number || license_plate;
    const rentalPrice = rental_price ?? daily_rate;
    const fuelTypeMap: Record<string, "PETROL" | "DIESEL" | "EV"> = {
      petrol: "PETROL",
      PETROL: "PETROL",
      diesel: "DIESEL",
      DIESEL: "DIESEL",
      electric: "EV",
      ev: "EV",
      EV: "EV",
    };
    const paymentTypeMap: Record<string, "DAILY" | "WEEKLY" | "MONTHLY"> = {
      daily: "DAILY",
      DAILY: "DAILY",
      weekly: "WEEKLY",
      WEEKLY: "WEEKLY",
      monthly: "MONTHLY",
      MONTHLY: "MONTHLY",
    };
    const rentalTypeMap: Record<string, "DRIVER_HOME" | "OWNER_HOME"> = {
      driver_home: "DRIVER_HOME",
      DRIVER_HOME: "DRIVER_HOME",
      owner_home: "OWNER_HOME",
      OWNER_HOME: "OWNER_HOME",
    };

    if (!brand || !model || !licenseNumber || !fuel_type || !owner_book || !rental_payment_type || !rental_type || !rentalPrice) {
      return res.status(400).json({ error: "Missing required car fields" });
    }

    if (!front_image || !back_image || !left_image || !right_image) {
      return res.status(400).json({ error: "Front, back, left, and right car images are required" });
    }

    const mappedFuelType = fuelTypeMap[String(fuel_type)] || fuelTypeMap[String(fuel_type).toLowerCase()];
    if (!mappedFuelType) {
      return res.status(400).json({ error: "Fuel type must be petrol, diesel, or electric" });
    }
    const mappedPaymentType = paymentTypeMap[String(rental_payment_type)] || paymentTypeMap[String(rental_payment_type).toLowerCase()];
    if (!mappedPaymentType) {
      return res.status(400).json({ error: "Rental payment type must be daily, weekly, or monthly" });
    }
    const mappedRentalType = rentalTypeMap[String(rental_type)] || rentalTypeMap[String(rental_type).toLowerCase()];
    if (!mappedRentalType) {
      return res.status(400).json({ error: "Rental type must be driver home or owner home" });
    }

    const car = await prisma.car.update({
      where: { id: existing.id },
      data: {
        brand,
        model,
        year: year ? Number(year) : null,
        color: color || null,
        licenseNumber,
        fuelType: mappedFuelType,
        ownerBook: owner_book,
        rentalPeriod: rental_period || null,
        rentalPaymentType: mappedPaymentType,
        rentalType: mappedRentalType,
        rentalPrice: String(rentalPrice),
        depositAmount: String(deposit_amount || 0),
        adminApprovalStatus: "PENDING",
        approvedAt: null,
        carImages: {
          upsert: {
            create: {
              id: crypto.randomUUID(),
              frontImage: front_image,
              backImage: back_image,
              leftImage: left_image,
              rightImage: right_image,
            },
            update: {
              frontImage: front_image,
              backImage: back_image,
              leftImage: left_image,
              rightImage: right_image,
            },
          },
        },
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Update car error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "License number is already used" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function toggleCarAvailability(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: String(req.params.carId), ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    const car = await prisma.car.update({
      where: { id: existing.id },
      data: {
        availabilityStatus: existing.availabilityStatus === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Toggle car availability error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: String(req.params.carId), ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    await prisma.car.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
