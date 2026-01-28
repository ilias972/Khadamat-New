-- Remove CMI Provider and add MANUAL payment support
-- This migration removes CMI-specific fields and adds generic manual payment support

-- CreateEnum: PaymentProvider
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL');

-- AlterTable: PaymentOrder
-- Remove CMI-specific columns
ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "procReturnCode";
ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "response";
ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "transId";
ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "rawCallback";

-- Add new columns for manual payment
ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

-- Update comment on oid column
COMMENT ON COLUMN "PaymentOrder"."oid" IS 'Référence unique de commande';
