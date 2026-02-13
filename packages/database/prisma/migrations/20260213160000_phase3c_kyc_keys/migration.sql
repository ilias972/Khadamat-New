-- Phase 3C: replace KYC URLs with private storage keys

ALTER TABLE "ProProfile" ADD COLUMN IF NOT EXISTS "kycCinFrontKey" TEXT;
ALTER TABLE "ProProfile" ADD COLUMN IF NOT EXISTS "kycCinBackKey"  TEXT;
ALTER TABLE "ProProfile" ADD COLUMN IF NOT EXISTS "kycSelfieKey"   TEXT;

UPDATE "ProProfile"
SET "kycCinFrontKey" = COALESCE("kycCinFrontKey", "kycCinFrontUrl")
WHERE "kycCinFrontUrl" IS NOT NULL;

UPDATE "ProProfile"
SET "kycCinBackKey" = COALESCE("kycCinBackKey", "kycCinBackUrl")
WHERE "kycCinBackUrl" IS NOT NULL;

UPDATE "ProProfile"
SET "kycSelfieKey" = COALESCE("kycSelfieKey", "kycSelfieUrl")
WHERE "kycSelfieUrl" IS NOT NULL;

ALTER TABLE "ProProfile" DROP COLUMN IF EXISTS "kycCinFrontUrl";
ALTER TABLE "ProProfile" DROP COLUMN IF EXISTS "kycCinBackUrl";
ALTER TABLE "ProProfile" DROP COLUMN IF EXISTS "kycSelfieUrl";
