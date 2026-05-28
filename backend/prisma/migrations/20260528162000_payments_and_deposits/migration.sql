CREATE TABLE IF NOT EXISTS "booking_payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL UNIQUE,
  "user_id" UUID NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "method" TEXT NOT NULL,
  "transaction_id" TEXT,
  "screenshot_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'under_review',
  "admin_notes" TEXT,
  "paid_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "confirmed_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "car_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "booking_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "booking_deposits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL UNIQUE,
  "driver_id" UUID NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'held',
  "payment_method" TEXT NOT NULL,
  "screenshot_url" TEXT,
  "paid_at" TIMESTAMP(3),
  "released_at" TIMESTAMP(3),
  "deducted_amount" DECIMAL(12, 2),
  "deduction_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_deposits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "car_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "booking_deposits_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE
);
