import type { Request, Response } from "express";
import prisma from "../src/lib/prisma.js";
import { requireUser } from "../src/lib/auth-helpers.js";
import {
  serializePayment,
  getBookingPayment,
  getPaymentQuote,
  serializeIncompletePayment,
  notifyAdminsAboutPayment,
} from "../src/lib/serializers.js";
import type { PaymentPayerRole } from "../src/lib/serializers.js";
import crypto from "crypto";

export async function submitPayment(req: Request, res: Response) {
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
}

export async function getBookingPayments(req: Request, res: Response) {
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
}

export async function getDriverPayments(req: Request, res: Response) {
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
}

export async function getOwnerPayments(req: Request, res: Response) {
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
}

export async function getPendingPayments(req: Request, res: Response) {
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
}

export async function confirmPayment(req: Request, res: Response) {
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
}

export async function rejectPayment(req: Request, res: Response) {
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
}
