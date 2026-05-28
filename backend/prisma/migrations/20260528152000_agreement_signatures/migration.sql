ALTER TABLE "car_applications"
ADD COLUMN IF NOT EXISTS "owner_agreement_agreed_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "driver_agreement_agreed_at" TIMESTAMP(3);
