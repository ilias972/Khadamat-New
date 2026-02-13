-- Phase 3B: regenerate public IDs to be non-derivable
-- Postgres required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Regenerate ALL User.publicId
UPDATE "User"
SET "publicId" = 'usr_' || replace(gen_random_uuid()::text, '-', '');

-- Regenerate ALL ProProfile.publicId
UPDATE "ProProfile"
SET "publicId" = 'pro_' || replace(gen_random_uuid()::text, '-', '');
