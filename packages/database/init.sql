-- Migration initiale pour Khadamat
-- Généré manuellement à partir du schema.prisma

-- Créer les enums
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PRO', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_CLIENT_LATE', 'CANCELLED_BY_PRO', 'CANCELLED_AUTO_FIRST_CONFIRMED', 'EXPIRED', 'COMPLETED');
CREATE TYPE "BookingEventType" AS ENUM ('CREATED', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'SLOTS_RELEASED');
CREATE TYPE "PenaltyType" AS ENUM ('CLIENT_CANCEL_LATE', 'PRO_CANCEL_CONFIRMED');
CREATE TYPE "SubscriptionPlan" AS ENUM ('PREMIUM_MONTHLY_NO_COMMIT', 'PREMIUM_ANNUAL_COMMIT');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "BoostStatus" AS ENUM ('ACTIVE', 'EXPIRED');
CREATE TYPE "EstimatedDuration" AS ENUM ('H1', 'H2', 'H3', 'H4', 'H8');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- Créer les tables
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
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

CREATE TABLE "ProProfile" (
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "kycCinFrontUrl" TEXT,
    "kycCinBackUrl" TEXT,
    "kycSelfieUrl" TEXT,
    "kycRejectionReason" TEXT,
    "premiumActiveUntil" TIMESTAMP(3),
    "boostActiveUntil" TIMESTAMP(3),
    "proCancelCount30d" INTEGER NOT NULL DEFAULT 0,
    "proConsecutiveCancelCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProProfile_pkey" PRIMARY KEY ("userId")
);

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
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "SlotLock" (
    "id" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "timeSlot" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotLock_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "PenaltyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyLog_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "token" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "ProSubscription_pkey" PRIMARY KEY ("id")
);

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

-- Créer les index et contraintes
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "ProService_proUserId_categoryId_key" ON "ProService"("proUserId", "categoryId");
CREATE INDEX "ProService_categoryId_idx" ON "ProService"("categoryId");
CREATE INDEX "Booking_clientId_cityId_categoryId_timeSlot_idx" ON "Booking"("clientId", "cityId", "categoryId", "timeSlot");
CREATE INDEX "Booking_proId_timeSlot_idx" ON "Booking"("proId", "timeSlot");
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");
CREATE UNIQUE INDEX "SlotLock_bookingId_key" ON "SlotLock"("bookingId");
CREATE UNIQUE INDEX "SlotLock_proUserId_timeSlot_key" ON "SlotLock"("proUserId", "timeSlot");
CREATE INDEX "SlotLock_createdAt_idx" ON "SlotLock"("createdAt");
CREATE UNIQUE INDEX "WeeklyAvailability_proUserId_dayOfWeek_key" ON "WeeklyAvailability"("proUserId", "dayOfWeek");
CREATE INDEX "AvailabilityException_proUserId_startAt_idx" ON "AvailabilityException"("proUserId", "startAt");
CREATE INDEX "AvailabilityException_bookingId_idx" ON "AvailabilityException"("bookingId");
CREATE INDEX "PenaltyLog_userId_createdAt_idx" ON "PenaltyLog"("userId", "createdAt");
CREATE INDEX "PenaltyLog_type_createdAt_idx" ON "PenaltyLog"("type", "createdAt");
CREATE INDEX "Report_bookingId_idx" ON "Report"("bookingId");
CREATE INDEX "Report_proId_createdAt_idx" ON "Report"("proId", "createdAt");
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");
CREATE INDEX "Review_proId_createdAt_idx" ON "Review"("proId", "createdAt");
CREATE UNIQUE INDEX "DeviceToken_platform_token_key" ON "DeviceToken"("platform", "token");
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");
CREATE INDEX "ProSubscription_proUserId_status_idx" ON "ProSubscription"("proUserId", "status");
CREATE INDEX "ProBoost_cityId_categoryId_status_startsAt_idx" ON "ProBoost"("cityId", "categoryId", "status", "startsAt");
CREATE INDEX "ProBoost_proUserId_endsAt_idx" ON "ProBoost"("proUserId", "endsAt");

-- Ajouter les foreign keys
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProService" ADD CONSTRAINT "ProService_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProService" ADD CONSTRAINT "ProService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlotLock" ADD CONSTRAINT "SlotLock_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyAvailability" ADD CONSTRAINT "WeeklyAvailability_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProSubscription" ADD CONSTRAINT "ProSubscription_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProBoost" ADD CONSTRAINT "ProBoost_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "ProProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProBoost" ADD CONSTRAINT "ProBoost_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProBoost" ADD CONSTRAINT "ProBoost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
