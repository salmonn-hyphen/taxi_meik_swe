-- CreateTable
CREATE TABLE "booking_payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "payer_role" TEXT NOT NULL,
    "payment_purpose" TEXT NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "transaction_id" TEXT,
    "screenshot_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "admin_notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_deposits" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "screenshot_url" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "deducted_amount" DECIMAL(12,2),
    "deduction_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_payments_booking_id_payer_role_key" ON "booking_payments"("booking_id", "payer_role");

-- CreateIndex
CREATE UNIQUE INDEX "booking_deposits_booking_id_key" ON "booking_deposits"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "car_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_deposits" ADD CONSTRAINT "booking_deposits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "car_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_deposits" ADD CONSTRAINT "booking_deposits_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
