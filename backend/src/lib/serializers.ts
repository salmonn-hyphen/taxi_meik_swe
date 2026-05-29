import prisma from "./prisma.js";
import crypto from "crypto";
import {
  serializeUser,
  isApprovedOwner,
  toUserVerificationStatus,
} from "../../service/ownerService.js";

export {
  serializeUser,
  isApprovedOwner,
  toUserVerificationStatus,
};

export type PaymentPayerRole = "DRIVER" | "OWNER";

export const DEFAULT_AGENCY_COMMISSION_RATE = 0.1;
export const FIRST_TIME_COMMISSION_RATE = 0.2;

export function serializeCar(car: any) {
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

export function applicationStatusToBookingStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") return "accepted";
  if (status === "REJECTED") return "cancelled";
  return "requested";
}

export function applicationToBookingStatus(application: any) {
  if (application.ownerApprovalStatus === "REJECTED" || application.adminApprovalStatus === "REJECTED") {
    return "cancelled";
  }
  if (application.payment?.status === "confirmed") return "active";
  if (application.payment?.status === "under_review") return "payment_pending";
  if (application.adminApprovalStatus === "APPROVED") return "accepted";
  if (application.ownerApprovalStatus === "APPROVED") return "accepted";
  return applicationStatusToBookingStatus(application.ownerApprovalStatus);
}

export function serializeBooking(application: any) {
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

export function serializePayment(payment: any) {
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

export function calculateCommissionAmount(totalAmount: number, rate: number) {
  return Math.round(totalAmount * rate);
}

export async function getCommissionRateForUser(userId: string, payerRole: PaymentPayerRole) {
  const [row] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM booking_payments
    WHERE user_id = ${userId}::uuid
      AND payer_role = ${payerRole}
      AND status = 'confirmed'
  `;

  return Number(row?.count || 0) === 0 ? FIRST_TIME_COMMISSION_RATE : DEFAULT_AGENCY_COMMISSION_RATE;
}

export async function getPaymentQuote(application: any, payerRole: PaymentPayerRole) {
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

export async function serializeIncompletePayment(application: any, payerRole: PaymentPayerRole) {
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

export function serializeDeposit(deposit: any) {
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

export function serializeIncompleteDeposit(application: any) {
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

export async function getBookingPayment(applicationId: string, payerRole: PaymentPayerRole = "DRIVER") {
  const [payment] = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM booking_payments
    WHERE booking_id = ${applicationId}::uuid
      AND payer_role = ${payerRole}
    LIMIT 1
  `;

  return payment || null;
}

export async function getBookingDeposit(applicationId: string) {
  const [deposit] = await prisma.$queryRaw<Array<any>>`
    SELECT * FROM booking_deposits WHERE booking_id = ${applicationId}::uuid LIMIT 1
  `;

  return deposit || null;
}

export async function serializeBookingWithFinancials(application: any) {
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

export async function notifyAdminsAboutPayment(application: any, payerRole: PaymentPayerRole, payment: any) {
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

export function serializeNotification(notification: any) {
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
