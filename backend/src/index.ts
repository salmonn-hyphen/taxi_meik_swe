import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import prisma from './lib/prisma.js';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import driverRouter from '../routes/driverRoutes.js';
import adminRouter from '../routes/admin/apiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const paymentUploadDir = path.resolve(__dirname, '../uploads/payments');
fs.mkdirSync(paymentUploadDir, { recursive: true });
const paymentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentUploadDir),
    filename: (_req, file, cb) => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
      cb(null, `${uniqueId}_${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

// Enable CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

// JSON parser for our custom routes. KYC/car images are sent as data URLs for now.
app.use(express.json({ limit: "80mb" }));

const OWNER_KYC_TYPES = new Set(["nrc_front", "nrc_back"]);
const DEFAULT_AGENCY_COMMISSION_RATE = 0.1;
const FIRST_TIME_COMMISSION_RATE = 0.2;

type AuthUser = {
  id: string;
  role: "OWNER" | "DRIVER" | "ADMIN";
};

type PaymentPayerRole = "DRIVER" | "OWNER";

async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  return user;
}

async function requireUser(req: Request, res: Response, roles?: AuthUser["role"][]) {
  const user = await getAuthUser(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ error: "You do not have permission to access this resource" });
    return null;
  }

  return user;
}

function toUserVerificationStatus(status?: string | null) {
  if (status === "APPROVED") return "verified";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function serializeOwnerDocuments(ownerProfile: any) {
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

function serializeUser(user: any) {
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

function serializeOwnerProfile(ownerProfile: any, user?: any) {
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

function isApprovedOwner(user: any) {
  return user.role === "OWNER" && (
    user.isVerified ||
    user.verificationStatus === "APPROVED" ||
    user.ownerProfile?.adminApprovalStatus === "APPROVED"
  );
}

function serializeCar(car: any) {
  const primaryImage = car.carImages?.frontImage;
  const dailyRate = Number(car.rentalPrice || 0);

  return {
    id: car.id,
    owner_id: car.ownerId,
    brand: car.brand,
    model: car.model,
    year: car.year,
    color: car.color || "",
    license_plate: car.licenseNumber,
    license_number: car.licenseNumber,
    seat_capacity: 4,
    fuel_type: String(car.fuelType || "").toLowerCase(),
    car_type: "sedan",
    transmission: "auto",
    mileage: null,
    daily_rate: dailyRate,
    weekly_rate: null,
    monthly_rate: null,
    deposit_amount: Number(car.depositAmount || 0),
    location: car.owner?.township || "",
    city: car.owner?.city || "",
    description: car.rentalPeriod || null,
    features: [],
    status: toUserVerificationStatus(car.adminApprovalStatus),
    is_available: car.availabilityStatus === "AVAILABLE",
    owner_book: car.ownerBook,
    rental_period: car.rentalPeriod,
    rental_payment_type: car.rentalPaymentType,
    rental_type: car.rentalType,
    rental_price: dailyRate,
    availability_status: car.availabilityStatus,
    admin_approval_status: car.adminApprovalStatus,
    created_at: car.createdAt.toISOString(),
    updated_at: car.updatedAt.toISOString(),
    owner: car.owner ? serializeUser(car.owner) : undefined,
    photos: primaryImage ? [{
      id: `${car.id}:front`,
      car_id: car.id,
      url: primaryImage,
      is_primary: true,
      created_at: car.carImages.createdAt.toISOString(),
    }] : [],
    images: car.carImages ? {
      front_image: car.carImages.frontImage,
      back_image: car.carImages.backImage,
      left_image: car.carImages.leftImage,
      right_image: car.carImages.rightImage,
    } : null,
  };
}

function applicationStatusToBookingStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") return "accepted";
  if (status === "REJECTED") return "cancelled";
  return "requested";
}

function applicationToBookingStatus(application: any) {
  if (application.ownerApprovalStatus === "REJECTED" || application.adminApprovalStatus === "REJECTED") {
    return "cancelled";
  }
  if (application.payment?.status === "confirmed") return "active";
  if (application.payment?.status === "under_review") return "payment_pending";
  if (application.adminApprovalStatus === "APPROVED") return "accepted";
  if (application.ownerApprovalStatus === "APPROVED") return "accepted";
  return applicationStatusToBookingStatus(application.ownerApprovalStatus);
}

function serializeBooking(application: any) {
  const createdAt = application.createdAt?.toISOString?.() || application.createdAt;
  const updatedAt = application.updatedAt?.toISOString?.() || application.updatedAt;
  const startDate = application.createdAt?.toISOString?.() || createdAt;
  const endDate = application.createdAt
    ? new Date(application.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : createdAt;
  const dailyRate = Number(application.car?.rentalPrice || 0);

  return {
    id: application.id,
    car_id: application.carId,
    driver_id: application.driverId,
    owner_id: application.ownerId,
    start_date: startDate,
    end_date: endDate,
    total_amount: dailyRate,
    status: applicationToBookingStatus(application),
    owner_approval_status: application.ownerApprovalStatus,
    admin_approval_status: application.adminApprovalStatus || "PENDING",
    agreement_sent_at: application.agreementSentAt?.toISOString?.() || null,
    driver_notes: application.wardRecommendationLetter || null,
    owner_notes: null,
    rejection_reason: application.ownerApprovalStatus === "REJECTED"
      ? "Rejected by owner"
      : application.adminApprovalStatus === "REJECTED"
        ? "Rejected by admin"
        : null,
    created_at: createdAt,
    updated_at: updatedAt,
    car: application.car ? serializeCar(application.car) : undefined,
    driver: application.driver ? serializeUser(application.driver) : undefined,
    owner: application.owner ? serializeUser(application.owner) : undefined,
  };
}

function serializePayment(payment: any) {
  if (!payment) return null;
  return {
    id: payment.id,
    booking_id: payment.booking_id,
    user_id: payment.user_id,
    amount: Number(payment.amount || 0),
    method: payment.method,
    payer_role: payment.payer_role || "DRIVER",
    payment_purpose: payment.payment_purpose || "rental_payment",
    commission_rate: Number(payment.commission_rate || 0),
    commission_amount: Number(payment.commission_amount || 0),
    transaction_id: payment.transaction_id,
    screenshot_url: payment.screenshot_url,
    status: payment.status,
    admin_notes: payment.admin_notes,
    paid_at: payment.paid_at?.toISOString?.() || payment.paid_at || null,
    confirmed_at: payment.confirmed_at?.toISOString?.() || payment.confirmed_at || null,
    confirmed_by: payment.confirmed_by,
    created_at: payment.created_at?.toISOString?.() || payment.created_at,
    updated_at: payment.updated_at?.toISOString?.() || payment.updated_at,
  };
}

function calculateCommissionAmount(totalAmount: number, rate: number) {
  return Math.round(totalAmount * rate);
}

async function getCommissionRateForUser(userId: string, payerRole: PaymentPayerRole) {
  const [row] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM booking_payments
    WHERE user_id = ${userId}::uuid
      AND payer_role = ${payerRole}
      AND status = 'confirmed'
  `;

  return Number(row?.count || 0) === 0 ? FIRST_TIME_COMMISSION_RATE : DEFAULT_AGENCY_COMMISSION_RATE;
}

async function getPaymentQuote(application: any, payerRole: PaymentPayerRole) {
  const userId = payerRole === "OWNER" ? application.ownerId : application.driverId;
  const totalAmount = Number(application.car?.rentalPrice || 0);
  const commissionRate = await getCommissionRateForUser(userId, payerRole);
  const commissionAmount = calculateCommissionAmount(totalAmount, commissionRate);

  return {
    userId,
    payerRole,
    paymentPurpose: payerRole === "OWNER" ? "owner_commission" : "driver_rental_payment",
    amount: payerRole === "OWNER" ? commissionAmount : totalAmount,
    commissionRate,
    commissionAmount,
  };
}

async function serializeIncompletePayment(application: any, payerRole: PaymentPayerRole) {
  const quote = await getPaymentQuote(application, payerRole);

  return {
    id: `incomplete-${payerRole.toLowerCase()}-${application.id}`,
    booking_id: application.id,
    user_id: quote.userId,
    amount: quote.amount,
    method: null,
    payer_role: payerRole,
    payment_purpose: quote.paymentPurpose,
    commission_rate: quote.commissionRate,
    commission_amount: quote.commissionAmount,
    transaction_id: null,
    screenshot_url: null,
    status: "incomplete",
    admin_notes: null,
    paid_at: null,
    confirmed_at: null,
    confirmed_by: null,
    created_at: application.createdAt?.toISOString?.() || application.createdAt,
    updated_at: application.updatedAt?.toISOString?.() || application.updatedAt,
  };
}

function serializeDeposit(deposit: any) {
  if (!deposit) return null;
  return {
    id: deposit.id,
    booking_id: deposit.booking_id,
    driver_id: deposit.driver_id,
    amount: Number(deposit.amount || 0),
    status: deposit.status,
    payment_method: deposit.payment_method,
    screenshot_url: deposit.screenshot_url,
    paid_at: deposit.paid_at?.toISOString?.() || deposit.paid_at || null,
    released_at: deposit.released_at?.toISOString?.() || deposit.released_at || null,
    deducted_amount: deposit.deducted_amount ? Number(deposit.deducted_amount) : null,
    deduction_reason: deposit.deduction_reason,
    created_at: deposit.created_at?.toISOString?.() || deposit.created_at,
    updated_at: deposit.updated_at?.toISOString?.() || deposit.updated_at,
  };
}

function serializeIncompleteDeposit(application: any) {
  return {
    id: `incomplete-${application.id}`,
    booking_id: application.id,
    driver_id: application.driverId,
    amount: Number(application.car?.depositAmount || 0),
    status: "incomplete",
    payment_method: null,
    screenshot_url: null,
    paid_at: null,
    released_at: null,
    deducted_amount: null,
    deduction_reason: null,
    created_at: application.createdAt?.toISOString?.() || application.createdAt,
    updated_at: application.updatedAt?.toISOString?.() || application.updatedAt,
  };
}

async function serializeBookingWithFinancials(application: any) {
  const payment = await getBookingPayment(application.id, "DRIVER");
  const ownerPayment = await getBookingPayment(application.id, "OWNER");
  const [deposit] = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM booking_deposits WHERE booking_id = ${application.id}::uuid LIMIT 1
  `;
  const booking = serializeBooking({ ...application, payment }) as any;
  return {
    ...booking,
    payment: serializePayment(payment),
    owner_payment: serializePayment(ownerPayment),
    deposit: serializeDeposit(deposit),
    payment_status: payment?.status || "incomplete",
    owner_payment_status: ownerPayment?.status || "incomplete",
    deposit_status: deposit?.status || "incomplete",
  };
}

async function getBookingPayment(applicationId: string, payerRole: PaymentPayerRole = "DRIVER") {
  const [payment] = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM booking_payments
    WHERE booking_id = ${applicationId}::uuid
      AND payer_role = ${payerRole}
    LIMIT 1
  `;

  return payment || null;
}

async function getBookingDeposit(applicationId: string) {
  const [deposit] = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM booking_deposits WHERE booking_id = ${applicationId}::uuid LIMIT 1
  `;

  return deposit || null;
}

async function notifyAdminsAboutPayment(application: any, payerRole: PaymentPayerRole, payment: any) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  const payer = await prisma.user.findUnique({
    where: { id: payerRole === "OWNER" ? application.ownerId : application.driverId },
    select: { name: true },
  });
  const carName = [application.car?.brand, application.car?.model].filter(Boolean).join(" ") || "a booking";
  const paymentKind = payerRole === "OWNER" ? "owner commission" : "driver payment";
  const amount = Number(payment?.amount || 0).toLocaleString("en-US");

  await prisma.notification.createMany({
    data: admins.map((adminUser) => ({
      id: crypto.randomUUID(),
      receiverId: adminUser.id,
      triggerUserId: payerRole === "OWNER" ? application.ownerId : application.driverId,
      title: "Payment proof submitted",
      message: `${payer?.name || payerRole} submitted ${paymentKind} proof for ${carName} (${amount} MMK).`,
      type: payerRole === "OWNER" ? "owner_payment_submitted" : "driver_payment_submitted",
      entityId: application.id,
    })),
  });
}

function serializeNotification(notification: any) {
  return {
    id: notification.id,
    user_id: notification.receiverId,
    title: notification.title,
    message: notification.message,
    type: notification.type || "info",
    is_read: notification.isRead,
    related_type: notification.type || null,
    related_id: notification.entityId || null,
    created_at: notification.createdAt.toISOString(),
  };
}

// Serve uploaded KYC documents as static files
app.use('/uploads/kyc', express.static(path.resolve(__dirname, '../uploads/kyc')));
app.use('/uploads/payments', express.static(paymentUploadDir));

// ─── Temporary in-memory store for pending registrations ──────────────────────
interface PendingRegistration {
  data: any;
  expiresAt: number;
}
const pendingRegistrations = new Map<string, PendingRegistration>();

// Cleanup expired registrations every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, value] of pendingRegistrations.entries()) {
    if (value.expiresAt < now) pendingRegistrations.delete(token);
  }
}, 5 * 60 * 1000);

// ─── STEP 1: Submit Registration Form & Send OTP ──────────────────────────────
// IMPORTANT: Must be registered BEFORE Better Auth's catch-all handler
app.post("/api/register-request", async (req, res) => {
  try {
    const data = req.body;
    const { email, phone, password, name, role } = data;

    if (!email || !phone || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ error: "Phone number is already registered" });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store registration data temporarily (10 min expiry)
    const tempToken = crypto.randomUUID();
    pendingRegistrations.set(tempToken, {
      data,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Upsert OTP into Verification table (5 min expiry)
    await prisma.verification.deleteMany({ where: { identifier: phone } });
    await prisma.verification.create({
      data: {
        id: crypto.randomUUID(),
        identifier: phone,
        value: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Log to console (replace with real SMS in production)
    console.log("OTP Code:", otpCode);
    console.log(`\n╔═══════════════════════════╗`);
    console.log(`║    REGISTER OTP SENT      ║`);
    console.log(`╠═══════════════════════════╣`);
    console.log(`║ Phone: ${phone.padEnd(18)}║`);
    console.log(`║ Code:  ${otpCode.padEnd(18)}║`);
    console.log(`╚═══════════════════════════╝\n`);

    return res.json({ success: true, message: "OTP sent successfully", tempToken, code: otpCode });

  } catch (error: any) {
    console.error("Register request error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── STEP 2: Verify OTP & Create Account ──────────────────────────────────────
// IMPORTANT: Must be registered BEFORE Better Auth's catch-all handler
app.post("/api/register-verify", async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: "Missing verification parameters" });
    }

    const registration = pendingRegistrations.get(tempToken);
    if (!registration || registration.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Registration session expired or invalid" });
    }

    const regData = registration.data;

    // Validate OTP against the Verification table
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: regData.phone,
        value: code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      return res.status(400).json({ error: "Invalid or expired OTP code" });
    }

    const existingVerifiedFields = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: regData.phone },
          ...(regData.nrc_number ? [{ nrcNumber: regData.nrc_number }] : []),
        ],
      },
      select: { phone: true, nrcNumber: true },
    });

    if (existingVerifiedFields?.phone === regData.phone) {
      return res.status(400).json({ error: "Phone number is already registered" });
    }

    if (regData.nrc_number && existingVerifiedFields?.nrcNumber === regData.nrc_number) {
      return res.status(400).json({ error: "NRC number is already registered" });
    }

    let newUser: Awaited<ReturnType<typeof auth.api.signUpEmail>> | null = null;

    try {
      // Create user via Better Auth (handles password hashing)
      newUser = await auth.api.signUpEmail({
        body: {
          email: regData.email,
          password: regData.password,
          name: regData.name,
          role: regData.role,
        },
      });

      if (!newUser?.user) {
        return res.status(500).json({ error: "Failed to create user account" });
      }

      // Patch user with custom fields
      const updatedUser = await prisma.user.update({
        where: { id: newUser.user.id },
        data: {
          phone: regData.phone,
          role: regData.role,
          nrcNumber: regData.nrc_number || null,
          city: regData.city || null,
          township: regData.township || null,
          address: regData.address || null,
          phoneNumberVerified: true,
          isVerified: false,
          verificationStatus: "PENDING",
        },
      });

      // If driver, create DriverLicense record
      if (regData.role === "DRIVER" && regData.license_number) {
        await prisma.driverLicense.create({
          data: {
            id: crypto.randomUUID(),
            userId: updatedUser.id,
            licenseNumber: regData.license_number,
            licenseClass: "B",
            expiryDate: new Date(
              regData.license_expiry || Date.now() + 5 * 365 * 24 * 60 * 60 * 1000
            ),
            documentUrl: regData.nrc_document_url || "",
            yearsExperience: regData.years_experience || 0,
            status: "PENDING",
          },
        });
      }

      if (regData.role === "OWNER") {
        await prisma.ownerProfile.create({
          data: {
            id: crypto.randomUUID(),
            userId: updatedUser.id,
            address: regData.address || null,
            nrcText: regData.nrc_number || "",
            nrcFrontImage: "",
            nrcBackImage: "",
            adminApprovalStatus: "PENDING",
          },
        });
      }
    } catch (error: any) {
      if (newUser?.user?.id) {
        await prisma.user.delete({ where: { id: newUser.user.id } }).catch(() => null);
      }

      if (error?.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : error.meta?.target;
        return res.status(400).json({ error: `${target || "A unique field"} is already registered` });
      }

      throw error;
    }

    // Clean up only after account creation succeeds, so failed attempts can be retried.
    await prisma.verification.delete({ where: { id: verification.id } });
    pendingRegistrations.delete(tempToken);

    return res.json({ success: true, message: "Registration completed successfully" });

  } catch (error: any) {
    console.error("Register verification error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Get email by phone number (used to sign in via Better Auth using phone input)
app.get("/api/get-email-by-phone", async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { email: true }
    });
    if (!user) {
      return res.status(404).json({ error: "No account found with this phone number" });
    }
    return res.json({ email: user.email });
  } catch (error: any) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Mount driver routes
app.use("/api/driver", driverRouter);

// Mount admin routes
app.use("/api/admin", adminRouter);

app.get("/api/user/profile", async (req, res) => {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { ownerProfile: true, driverProfile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ data: serializeUser(user) });
  } catch (error: any) {
    console.error("Get user profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/owner/profile", async (req, res) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const owner = await prisma.user.findUnique({
      where: { id: user.id },
      include: { ownerProfile: true },
    });

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const ownerProfile = owner.ownerProfile || await prisma.ownerProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: owner.id,
        address: owner.address,
        nrcText: owner.nrcNumber || "",
        nrcFrontImage: "",
        nrcBackImage: "",
        adminApprovalStatus: "PENDING",
      },
    });

    return res.json({ data: serializeOwnerProfile(ownerProfile, owner) });
  } catch (error: any) {
    console.error("Get owner profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/owner/profile", async (req, res) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const nrcText = req.body.nrc_text || req.body.nrc_number || req.body.nrcText || "";
    const address = req.body.address || null;

    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId: user.id },
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        address,
        nrcText,
        nrcFrontImage: "",
        nrcBackImage: "",
        adminApprovalStatus: "PENDING",
      },
      update: {
        address,
        nrcText,
        adminApprovalStatus: "PENDING",
        approvedAt: null,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        nrcNumber: nrcText || null,
        address,
        verificationStatus: "PENDING",
        isVerified: false,
      },
      include: { ownerProfile: true },
    });

    return res.json({ data: serializeOwnerProfile(ownerProfile, updatedUser) });
  } catch (error: any) {
    console.error("Update owner profile error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "NRC number is already registered" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/owner/documents", async (req, res) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.id },
    });

    return res.json({
      data: serializeOwnerDocuments(ownerProfile),
    });
  } catch (error: any) {
    console.error("Get owner documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/owner/documents", async (req, res) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const { type, fileSize, fileData } = req.body;

    if (!OWNER_KYC_TYPES.has(type)) {
      return res.status(400).json({ error: "Unsupported owner KYC document type" });
    }

    if (!fileData || typeof fileData !== "string" || !fileData.startsWith("data:")) {
      return res.status(400).json({ error: "Document file data is required" });
    }

    if (typeof fileSize === "number" && fileSize > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Document file must be smaller than 5MB" });
    }

    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId: user.id },
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        nrcText: "",
        nrcFrontImage: type === "nrc_front" ? fileData : "",
        nrcBackImage: type === "nrc_back" ? fileData : "",
        adminApprovalStatus: "PENDING",
      },
      update: {
        ...(type === "nrc_front" ? { nrcFrontImage: fileData } : {}),
        ...(type === "nrc_back" ? { nrcBackImage: fileData } : {}),
        adminApprovalStatus: "PENDING",
        approvedAt: null,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: "PENDING",
        isVerified: false,
      },
    });

    const document = serializeOwnerDocuments(ownerProfile).find((item) => item.type === type);
    return res.json({ data: document });
  } catch (error: any) {
    console.error("Upload owner document error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/admin/verifications/owners", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const owners = await prisma.user.findMany({
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

    return res.json({ data: owners.map(serializeUser) });
  } catch (error: any) {
    console.error("Get pending owner verifications error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/verifications/owners/:userId", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const { userId } = req.params;
    const { status, notes } = req.body;
    const nextStatus = status === "verified" || status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : null;

    if (!nextStatus) {
      return res.status(400).json({ error: "Status must be verified, approved, or rejected" });
    }

    const owner = await prisma.user.findFirst({
      where: { id: userId, role: "OWNER" },
      include: {
        ownerProfile: true,
      },
    });

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const hasRequiredDocuments = !!owner.ownerProfile?.nrcFrontImage && !!owner.ownerProfile?.nrcBackImage;

    if (nextStatus === "APPROVED" && !hasRequiredDocuments) {
      return res.status(400).json({ error: "Owner must submit NRC front and NRC back before approval" });
    }

    const updatedOwner = await prisma.$transaction(async (tx) => {
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

    return res.json({ data: serializeUser(updatedOwner) });
  } catch (error: any) {
    console.error("Verify owner error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/admin/users/:userId/owner-documents", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: req.params.userId },
    });

    return res.json({
      data: serializeOwnerDocuments(ownerProfile),
    });
  } catch (error: any) {
    console.error("Get admin owner documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/admin/verifications/cars", async (req, res) => {
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
});

app.post("/api/admin/verifications/cars/:carId", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const { status } = req.body;
    const nextStatus = status === "verified" || status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : null;

    if (!nextStatus) {
      return res.status(400).json({ error: "Status must be verified, approved, or rejected" });
    }

    const existing = await prisma.car.findUnique({
      where: { id: req.params.carId },
      include: { owner: { include: { ownerProfile: true } } },
    });

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
});

app.get("/api/owner/cars", async (req, res) => {
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
});

app.get("/api/cars/:carId", async (req, res) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.carId },
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

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Get car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/cars", async (req, res) => {
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
});

app.post("/api/owner/cars", async (req, res) => {
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
});

app.put("/api/owner/cars/:carId", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
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
});

app.post("/api/owner/cars/:carId/toggle-availability", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
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
});

app.post("/api/driver/bookings", async (req, res) => {
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

      const app = existing
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

      await tx.notification.create({
        data: {
          id: crypto.randomUUID(),
          receiverId: car.ownerId,
          triggerUserId: authUser.id,
          title: "New car borrow request",
          message: `${driver.name} applied to borrow your ${car.brand} ${car.model}.`,
          type: "booking_request",
          entityId: app.id,
        },
      });

      return app;
    });

    return res.status(201).json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Create driver booking request error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/driver/bookings", async (req, res) => {
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
});

app.get("/api/driver/bookings/:id", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: { id: req.params.id, driverId: authUser.id },
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
});

app.get("/api/owner/bookings", async (req, res) => {
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
});

app.get("/api/owner/bookings/:id", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerId: authUser.id },
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
});

app.get("/api/admin/bookings", async (req, res) => {
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
});

app.post("/api/admin/bookings/:id/accept", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerApprovalStatus: "APPROVED" },
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
});

app.post("/api/admin/bookings/:id/reject", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerApprovalStatus: "APPROVED" },
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
});

app.post("/api/admin/bookings/:id/send-agreement", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerApprovalStatus: "APPROVED", adminApprovalStatus: "APPROVED" },
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
});

app.get("/api/agreements/:id", async (req, res) => {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const application = await prisma.carApplication.findUnique({
      where: { id: req.params.id },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Agreement not found" });
    }

    const canView =
      authUser.role === "ADMIN" ||
      application.ownerId === authUser.id ||
      application.driverId === authUser.id;

    if (!canView) {
      return res.status(403).json({ error: "You do not have permission to view this agreement" });
    }

    const [agreementStatus] = await prisma.$queryRaw<Array<{
      owner_agreement_agreed_at: Date | null;
      driver_agreement_agreed_at: Date | null;
    }>>`
      SELECT owner_agreement_agreed_at, driver_agreement_agreed_at
      FROM car_applications
      WHERE id = ${application.id}::uuid
    `;

    return res.json({
      data: {
        ...serializeBooking(application),
        owner_agreement_agreed_at: agreementStatus?.owner_agreement_agreed_at?.toISOString?.() || null,
        driver_agreement_agreed_at: agreementStatus?.driver_agreement_agreed_at?.toISOString?.() || null,
        owner_profile: {
          nrc_number: application.owner?.nrcNumber || application.owner?.ownerProfile?.nrcText || "",
          address: application.owner?.address || application.owner?.ownerProfile?.address || "",
          city: application.owner?.city || "",
          township: application.owner?.township || "",
          phone: application.owner?.phone || "",
        },
        driver_profile: {
          nrc_number: application.driver?.nrcNumber || application.driver?.driverProfile?.nrcText || "",
          address: application.driver?.address || application.driver?.driverProfile?.address || "",
          city: application.driver?.city || "",
          township: application.driver?.township || "",
          phone: application.driver?.phone || "",
        },
      },
    });
  } catch (error: any) {
    console.error("Get agreement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/agreements", async (req, res) => {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const applications = await prisma.carApplication.findMany({
      where: {
        agreementSentAt: { not: null },
        ...(authUser.role === "OWNER"
          ? { ownerId: authUser.id }
          : authUser.role === "DRIVER"
            ? { driverId: authUser.id }
            : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { agreementSentAt: "desc" },
    });

    const data = await Promise.all(applications.map(async (application) => {
      const [agreementStatus] = await prisma.$queryRaw<Array<{
        owner_agreement_agreed_at: Date | null;
        driver_agreement_agreed_at: Date | null;
      }>>`
        SELECT owner_agreement_agreed_at, driver_agreement_agreed_at
        FROM car_applications
        WHERE id = ${application.id}::uuid
      `;

      return {
        ...serializeBooking(application),
        owner_agreement_agreed_at: agreementStatus?.owner_agreement_agreed_at?.toISOString?.() || null,
        driver_agreement_agreed_at: agreementStatus?.driver_agreement_agreed_at?.toISOString?.() || null,
      };
    }));

    return res.json({ data });
  } catch (error: any) {
    console.error("Get agreements error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/agreements/:id/agree", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER", "DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findUnique({
      where: { id: req.params.id },
      include: {
        car: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Agreement not found" });
    }

    const isOwner = authUser.role === "OWNER" && application.ownerId === authUser.id;
    const isDriver = authUser.role === "DRIVER" && application.driverId === authUser.id;

    if (!isOwner && !isDriver) {
      return res.status(403).json({ error: "You do not have permission to agree to this agreement" });
    }

    const [status] = await prisma.$transaction(async (tx) => {
      if (isOwner) {
        await tx.$executeRaw`
          UPDATE car_applications
          SET owner_agreement_agreed_at = COALESCE(owner_agreement_agreed_at, NOW())
          WHERE id = ${application.id}::uuid
        `;
      }

      if (isDriver) {
        await tx.$executeRaw`
          UPDATE car_applications
          SET driver_agreement_agreed_at = COALESCE(driver_agreement_agreed_at, NOW())
          WHERE id = ${application.id}::uuid
        `;
      }

      const rows = await tx.$queryRaw<Array<{
        owner_agreement_agreed_at: Date | null;
        driver_agreement_agreed_at: Date | null;
      }>>`
        SELECT owner_agreement_agreed_at, driver_agreement_agreed_at
        FROM car_applications
        WHERE id = ${application.id}::uuid
      `;

      const nextStatus = rows[0];
      if (nextStatus?.owner_agreement_agreed_at && nextStatus.driver_agreement_agreed_at) {
        await tx.car.update({
          where: { id: application.carId },
          data: { availabilityStatus: "RENTED" },
        });

        await tx.carApplication.updateMany({
          where: {
            carId: application.carId,
            id: { not: application.id },
            adminApprovalStatus: { not: "REJECTED" },
          },
          data: { adminApprovalStatus: "REJECTED" },
        });
      }

      return rows;
    });

    return res.json({
      data: {
        owner_agreement_agreed_at: status?.owner_agreement_agreed_at?.toISOString?.() || null,
        driver_agreement_agreed_at: status?.driver_agreement_agreed_at?.toISOString?.() || null,
      },
    });
  } catch (error: any) {
    console.error("Agree agreement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/bookings/:id/payments", paymentUpload.single("screenshot"), async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "OWNER"]);
    if (!authUser) return;
    const bookingId = String(req.params.id);
    const payerRole: PaymentPayerRole = authUser.role === "OWNER" ? "OWNER" : "DRIVER";

    const application = await prisma.carApplication.findFirst({
      where: {
        id: bookingId,
        ...(payerRole === "OWNER" ? { ownerId: authUser.id } : { driverId: authUser.id }),
        ownerApprovalStatus: "APPROVED",
        adminApprovalStatus: "APPROVED",
      },
      include: { car: true },
    }) as any;

    if (!application) {
      return res.status(404).json({ error: "Approved booking not found" });
    }

    const method = String(req.body.method || "");
    if (!method) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;
    if (!screenshotUrl) {
      return res.status(400).json({ error: "Payment screenshot is required" });
    }

    const quote = await getPaymentQuote(application, payerRole);

    await prisma.$executeRaw`
      INSERT INTO booking_payments (
        id, booking_id, user_id, amount, method, payer_role, payment_purpose,
        commission_rate, commission_amount, transaction_id, screenshot_url,
        status, paid_at, created_at, updated_at
      )
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${application.id}::uuid,
        ${quote.userId}::uuid,
        ${String(quote.amount)}::decimal,
        ${method},
        ${payerRole},
        ${quote.paymentPurpose},
        ${String(quote.commissionRate)}::decimal,
        ${String(quote.commissionAmount)}::decimal,
        ${req.body.transaction_id || null},
        ${screenshotUrl},
        'under_review',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (booking_id, payer_role) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        amount = EXCLUDED.amount,
        method = EXCLUDED.method,
        payment_purpose = EXCLUDED.payment_purpose,
        commission_rate = EXCLUDED.commission_rate,
        commission_amount = EXCLUDED.commission_amount,
        transaction_id = EXCLUDED.transaction_id,
        screenshot_url = EXCLUDED.screenshot_url,
        status = 'under_review',
        admin_notes = NULL,
        paid_at = NOW(),
        confirmed_at = NULL,
        confirmed_by = NULL,
        updated_at = NOW()
    `;

    const payment = await getBookingPayment(application.id, payerRole);
    await notifyAdminsAboutPayment(application, payerRole, payment);
    return res.json({ data: serializePayment(payment) });
  } catch (error: any) {
    console.error("Submit payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/bookings/:id/payments", async (req, res) => {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: {
        id: req.params.id,
        ...(authUser.role === "DRIVER"
          ? { driverId: authUser.id }
          : authUser.role === "OWNER"
            ? { ownerId: authUser.id }
            : {}),
      },
      include: { car: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const payerRole: PaymentPayerRole = authUser.role === "OWNER" ? "OWNER" : "DRIVER";
    const payment = await getBookingPayment(application.id, payerRole);
    return res.json({ data: payment ? serializePayment(payment) : await serializeIncompletePayment(application, payerRole) });
  } catch (error: any) {
    console.error("Get booking payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/driver/payments", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const applications = await prisma.carApplication.findMany({
      where: {
        driverId: authUser.id,
        ownerApprovalStatus: "APPROVED",
        adminApprovalStatus: "APPROVED",
      },
      include: { car: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = await Promise.all(applications.map(async (application) => {
      const payment = await getBookingPayment(application.id, "DRIVER");
      return payment ? serializePayment(payment) : await serializeIncompletePayment(application, "DRIVER");
    }));

    return res.json({
      data,
      current_page: 1,
      per_page: data.length,
      total: data.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get driver payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/owner/payments", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const applications = await prisma.carApplication.findMany({
      where: {
        ownerId: authUser.id,
        ownerApprovalStatus: "APPROVED",
        adminApprovalStatus: "APPROVED",
      },
      include: { car: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = await Promise.all(applications.map(async (application) => {
      const payment = await getBookingPayment(application.id, "OWNER");
      return payment ? serializePayment(payment) : await serializeIncompletePayment(application, "OWNER");
    }));

    return res.json({
      data,
      current_page: 1,
      per_page: data.length,
      total: data.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get owner payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/admin/payments/pending", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const payments = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_payments
      WHERE status = 'under_review'
      ORDER BY paid_at ASC NULLS LAST, created_at ASC
    `;

    return res.json({ data: payments.map(serializePayment) });
  } catch (error: any) {
    console.error("Get pending payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/payments/:id/confirm", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_payments
      SET status = 'confirmed',
          admin_notes = ${req.body.notes || null},
          confirmed_at = NOW(),
          confirmed_by = ${admin.id}::uuid,
          updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [payment] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_payments WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.json({ data: serializePayment(payment) });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/payments/:id/reject", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_payments
      SET status = 'failed',
          admin_notes = ${req.body.reason || "Payment rejected"},
          confirmed_at = NULL,
          confirmed_by = ${admin.id}::uuid,
          updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [payment] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_payments WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.json({ data: serializePayment(payment) });
  } catch (error: any) {
    console.error("Reject payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/bookings/:id/deposits", paymentUpload.single("screenshot"), async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: {
        id: String(req.params.id),
        driverId: authUser.id,
        ownerApprovalStatus: "APPROVED",
        adminApprovalStatus: "APPROVED",
      },
      include: { car: true },
    }) as any;

    if (!application) {
      return res.status(404).json({ error: "Approved booking not found" });
    }

    const payment = await getBookingPayment(application.id, "DRIVER");
    if (payment?.status !== "confirmed") {
      return res.status(400).json({ error: "Payment must be confirmed before submitting deposit" });
    }

    const method = String(req.body.payment_method || req.body.method || "");
    if (!method) {
      return res.status(400).json({ error: "Deposit payment method is required" });
    }

    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;
    if (!screenshotUrl) {
      return res.status(400).json({ error: "Deposit screenshot is required" });
    }

    await prisma.$executeRaw`
      INSERT INTO booking_deposits (
        id, booking_id, driver_id, amount, status, payment_method, screenshot_url,
        paid_at, created_at, updated_at
      )
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${application.id}::uuid,
        ${authUser.id}::uuid,
        ${String(application.car.depositAmount || 0)}::decimal,
        'held',
        ${method},
        ${screenshotUrl},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (booking_id) DO UPDATE SET
        driver_id = EXCLUDED.driver_id,
        amount = EXCLUDED.amount,
        status = 'held',
        payment_method = EXCLUDED.payment_method,
        screenshot_url = EXCLUDED.screenshot_url,
        paid_at = NOW(),
        released_at = NULL,
        deducted_amount = NULL,
        deduction_reason = NULL,
        updated_at = NOW()
    `;

    const deposit = await getBookingDeposit(application.id);
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Submit deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/bookings/:id/deposits", async (req, res) => {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: {
        id: String(req.params.id),
        ...(authUser.role === "DRIVER"
          ? { driverId: authUser.id }
          : authUser.role === "OWNER"
            ? { ownerId: authUser.id }
            : {}),
      },
      include: { car: true },
    }) as any;

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const deposit = await getBookingDeposit(application.id);
    return res.json({ data: deposit ? serializeDeposit(deposit) : serializeIncompleteDeposit(application) });
  } catch (error: any) {
    console.error("Get booking deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/driver/deposits", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "ADMIN"]);
    if (!authUser) return;

    const deposits = authUser.role === "ADMIN"
      ? await prisma.$queryRaw<Array<any>>`
          SELECT * FROM booking_deposits ORDER BY created_at DESC
        `
      : await prisma.$queryRaw<Array<any>>`
          SELECT * FROM booking_deposits
          WHERE driver_id = ${authUser.id}::uuid
          ORDER BY created_at DESC
        `;

    return res.json({ data: deposits.map(serializeDeposit) });
  } catch (error: any) {
    console.error("Get driver deposits error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/owner/deposits", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER", "ADMIN"]);
    if (!authUser) return;

    const deposits = authUser.role === "ADMIN"
      ? await prisma.$queryRaw<Array<any>>`
          SELECT d.* FROM booking_deposits d ORDER BY d.created_at DESC
        `
      : await prisma.$queryRaw<Array<any>>`
          SELECT d.* FROM booking_deposits d
          INNER JOIN car_applications a ON a.id = d.booking_id
          WHERE a.owner_id = ${authUser.id}::uuid
          ORDER BY d.created_at DESC
        `;

    return res.json({ data: deposits.map(serializeDeposit) });
  } catch (error: any) {
    console.error("Get owner deposits error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/deposits/:id/freeze", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_deposits SET status = 'frozen', updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Freeze deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/deposits/:id/release", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_deposits
      SET status = 'released', released_at = NOW(), updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Release deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/deposits/:id/deduct", async (req, res) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_deposits
      SET status = 'deducted',
          deducted_amount = ${String(req.body.amount || 0)}::decimal,
          deduction_reason = ${req.body.reason || null},
          updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Deduct deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "OWNER", "ADMIN"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: {
        id: req.params.id,
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
});

app.post("/api/owner/bookings/:id/accept", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerId: authUser.id },
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
});

app.post("/api/owner/bookings/:id/reject", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerId: authUser.id },
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
});

app.get("/api/notifications", async (req, res) => {
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
});

app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await prisma.notification.updateMany({
      where: { id: req.params.id, receiverId: authUser.id },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/notifications/read-all", async (req, res) => {
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
});

app.get("/api/notifications/unread-count", async (req, res) => {
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
});

app.delete("/api/owner/cars/:carId", async (req, res) => {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
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
});

// ─── Better Auth Route Handler (catch-all — must come LAST) ───────────────────
app.all("/api/auth/*splat", toNodeHandler(auth));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
