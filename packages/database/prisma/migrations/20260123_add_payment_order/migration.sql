-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "oid" TEXT NOT NULL,
    "proUserId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "procReturnCode" TEXT,
    "response" TEXT,
    "transId" TEXT,
    "cityId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "rawCallback" JSONB,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_oid_key" ON "PaymentOrder"("oid");

-- CreateIndex
CREATE INDEX "PaymentOrder_proUserId_status_idx" ON "PaymentOrder"("proUserId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_oid_idx" ON "PaymentOrder"("oid");
