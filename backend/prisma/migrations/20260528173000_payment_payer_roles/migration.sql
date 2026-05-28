ALTER TABLE "booking_payments"
ADD COLUMN IF NOT EXISTS "payer_role" TEXT NOT NULL DEFAULT 'DRIVER',
ADD COLUMN IF NOT EXISTS "payment_purpose" TEXT NOT NULL DEFAULT 'rental_payment',
ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5, 4) NOT NULL DEFAULT 0.2000,
ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE "booking_payments"
DROP CONSTRAINT IF EXISTS "booking_payments_booking_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "booking_payments_booking_id_payer_role_key"
ON "booking_payments" ("booking_id", "payer_role");
