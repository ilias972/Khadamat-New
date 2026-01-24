-- AlterTable
ALTER TABLE "ProProfile" ADD COLUMN "cinNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_cinNumber_key" ON "ProProfile"("cinNumber");
