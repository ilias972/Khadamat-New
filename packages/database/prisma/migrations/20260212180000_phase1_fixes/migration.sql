-- CreateEnum
CREATE TYPE "PaymentOrderPlanType" AS ENUM ('PREMIUM_MONTHLY', 'PREMIUM_ANNUAL', 'BOOST');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "publicId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "publicId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentOrder" DROP COLUMN "planType",
ADD COLUMN     "planType" "PaymentOrderPlanType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_token_idx" ON "NewsletterSubscriber"("token");

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_proId_idx" ON "Booking"("proId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_publicId_key" ON "Category"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "City_publicId_key" ON "City"("publicId");

-- CreateIndex
CREATE INDEX "PaymentOrder_proUserId_status_idx" ON "PaymentOrder"("proUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
