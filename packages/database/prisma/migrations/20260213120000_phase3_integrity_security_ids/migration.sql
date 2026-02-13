-- Phase 3: Integrity, Security & Public IDs
-- Single migration covering all Phase 3 DB changes.

-- ============================================================
-- 1) Add publicId to User (NOT NULL with backfill)
-- ============================================================
ALTER TABLE "User" ADD COLUMN "publicId" TEXT;
UPDATE "User" SET "publicId" = 'usr_' || SUBSTRING("id", 1, 12) WHERE "publicId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- ============================================================
-- 2) Add publicId to ProProfile (NOT NULL with backfill)
-- ============================================================
ALTER TABLE "ProProfile" ADD COLUMN "publicId" TEXT;
UPDATE "ProProfile" SET "publicId" = 'pro_' || SUBSTRING("userId", 1, 12) WHERE "publicId" IS NULL;
ALTER TABLE "ProProfile" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "ProProfile_publicId_key" ON "ProProfile"("publicId");

-- ============================================================
-- 3) KYC Security: cinNumber → cinHash
-- ============================================================
-- Add cinHash column
ALTER TABLE "ProProfile" ADD COLUMN "cinHash" TEXT;

-- Migrate existing cinNumber values to cinHash using pgcrypto digest
-- Real app code will use salted SHA-256 via CIN_HASH_SALT env var.
UPDATE "ProProfile" SET "cinHash" = encode(digest("cinNumber"::bytea, 'sha256'), 'hex') WHERE "cinNumber" IS NOT NULL;

-- Drop cinNumber column and its unique index
DROP INDEX IF EXISTS "ProProfile_cinNumber_key";
ALTER TABLE "ProProfile" DROP COLUMN "cinNumber";

-- ============================================================
-- 4) Drop dead tables: DeviceToken, Report, PenaltyLog,
--    AvailabilityException, SlotLock
-- ============================================================

-- Drop DeviceToken
DROP TABLE IF EXISTS "DeviceToken" CASCADE;

-- Drop Report
DROP TABLE IF EXISTS "Report" CASCADE;

-- Drop PenaltyLog
DROP TABLE IF EXISTS "PenaltyLog" CASCADE;

-- Drop AvailabilityException
DROP TABLE IF EXISTS "AvailabilityException" CASCADE;

-- Drop SlotLock
DROP TABLE IF EXISTS "SlotLock" CASCADE;

-- Drop unused enums
DROP TYPE IF EXISTS "PenaltyType" CASCADE;
DROP TYPE IF EXISTS "ReportStatus" CASCADE;
DROP TYPE IF EXISTS "Platform" CASCADE;

-- ============================================================
-- 5) Add composite index on Booking (proId, status, timeSlot)
-- ============================================================
CREATE INDEX "Booking_proId_status_timeSlot_idx" ON "Booking"("proId", "status", "timeSlot");
