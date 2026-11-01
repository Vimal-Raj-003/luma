-- Direct UPI QR payments confirmed by the Super Admin (the customer submits the UTR; nothing is PAID until the admin confirms the bank credit).
-- Additive only: no table, column or row is removed or rewritten.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TABLE "Payment" ALTER COLUMN "razorpayOrderId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'RAZORPAY';
ALTER TABLE "Payment" ADD COLUMN "utr" TEXT;
ALTER TABLE "Payment" ADD COLUMN "utrSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "decidedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "adminNote" TEXT;
CREATE UNIQUE INDEX "Payment_utr_key" ON "Payment"("utr");
