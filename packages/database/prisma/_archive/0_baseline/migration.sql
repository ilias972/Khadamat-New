-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PRO', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_CLIENT_LATE', 'CANCELLED_BY_PRO', 'CANCELLED_AUTO_FIRST_CONFIRMED', 'CANCELLED_AUTO_OVERLAP', 'EXPIRED', 'WAITING_FOR_CLIENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('CREATED', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'SLOTS_RELEASED');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('CLIENT_CANCEL_LATE', 'PRO_CANCEL_CONFIRMED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('PREMIUM_MONTHLY_NO_COMMIT', 'PREMIUM_ANNUAL_COMMIT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EstimatedDuration" AS ENUM ('H1', 'H2', 'H3', 'H4', 'H8');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL');

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "cityId" TEXT,
    "addressLine" TEXT,
    "clientLateCancelCount30d" INTEGER NOT NULL DEFAULT 0,
    "clientSanctionTier" INTEGER NOT NULL DEFAULT 0,
    "bookingCooldownUntil" TIMESTAMP(3),
    "clientPenaltyResetAt" TIMESTAMP(3),
    "bannedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProProfile" (
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "cinNumber" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "kycCinFrontUrl" TEXT,
    "kycCinBackUrl" TEXT,
    "kycSelfieUrl" TEXT,
    "kycRejectionReason" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumActiveUntil" TIMESTAMP(3),
    "boostActiveUntil" TIMESTAMP(3),
    "proCancelCount30d" INTEGER NOT NULL DEFAULT 0,
    "proConsecutiveCancelCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ProService" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pricingType" TEXT,
    "minPriceMad" INTEGER,
    "maxPriceMad" INTEGER,
    "fixedPriceMad" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "timeSlot" TIMESTAMP(3) NOT NULL,
    "cityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "estimatedDuration" "EstimatedDuration" DEFAULT 'H1',
    "duration" INTEGER NOT NULL DEFAULT 1,
    "isModifiedByPro" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "BookingEventType" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotLock" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "timeSlot" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAvailability" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "isWithinDisputeWindow" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "token" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProSubscription" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "commitmentStartsAt" TIMESTAMP(3),
    "commitmentEndsAt" TIMESTAMP(3),
    "priceMad" INTEGER NOT NULL,
    "introDiscountMad" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "transactionId" TEXT,

    CONSTRAINT "ProSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProBoost" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "stripePaymentIntentId" TEXT,
    "priceMad" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProBoost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "oid" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "cityId" TEXT,
    "categoryId" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_cinNumber_key" ON "ProProfile"("cinNumber");

-- CreateIndex
CREATE INDEX "ProService_categoryId_idx" ON "ProService"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProService_proUserId_categoryId_key" ON "ProService"("proUserId", "categoryId");

-- CreateIndex
CREATE INDEX "Booking_clientId_cityId_categoryId_timeSlot_idx" ON "Booking"("clientId", "cityId", "categoryId", "timeSlot");

-- CreateIndex
CREATE INDEX "Booking_proId_timeSlot_idx" ON "Booking"("proId", "timeSlot");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlotLock_bookingId_key" ON "SlotLock"("bookingId");

-- CreateIndex
CREATE INDEX "SlotLock_createdAt_idx" ON "SlotLock"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlotLock_proUserId_timeSlot_key" ON "SlotLock"("proUserId", "timeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAvailability_proUserId_dayOfWeek_key" ON "WeeklyAvailability"("proUserId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "AvailabilityException_proUserId_startAt_idx" ON "AvailabilityException"("proUserId", "startAt");

-- CreateIndex
CREATE INDEX "AvailabilityException_bookingId_idx" ON "AvailabilityException"("bookingId");

-- CreateIndex
CREATE INDEX "PenaltyLog_userId_createdAt_idx" ON "PenaltyLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PenaltyLog_type_createdAt_idx" ON "PenaltyLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Report_bookingId_idx" ON "Report"("bookingId");

-- CreateIndex
CREATE INDEX "Report_proId_createdAt_idx" ON "Report"("proId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_proId_createdAt_idx" ON "Review"("proId", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_platform_token_key" ON "DeviceToken"("platform", "token");

-- CreateIndex
CREATE INDEX "ProSubscription_proUserId_status_idx" ON "ProSubscription"("proUserId", "status");

-- CreateIndex
CREATE INDEX "ProBoost_cityId_categoryId_status_startsAt_idx" ON "ProBoost"("cityId", "categoryId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "ProBoost_proUserId_endsAt_idx" ON "ProBoost"("proUserId", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_oid_key" ON "PaymentOrder"("oid");

-- CreateIndex
CREATE INDEX "PaymentOrder_proUserId_status_idx" ON "PaymentOrder"("proUserId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_oid_idx" ON "PaymentOrder"("oid");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProService" ADD CONSTRAINT "ProService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProService" ADD CONSTRAINT "ProService_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAvailability" ADD CONSTRAINT "WeeklyAvailability_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSubscription" ADD CONSTRAINT "ProSubscription_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProBoost" ADD CONSTRAINT "ProBoost_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProBoost" ADD CONSTRAINT "ProBoost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProBoost" ADD CONSTRAINT "ProBoost_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

