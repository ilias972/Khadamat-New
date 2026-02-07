-- CreateTable
CREATE TABLE "KycAccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycAccessLog_userId_idx" ON "KycAccessLog"("userId");

-- CreateIndex
CREATE INDEX "KycAccessLog_createdAt_idx" ON "KycAccessLog"("createdAt");
