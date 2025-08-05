-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."TerritoryCapture" ADD COLUMN     "captureMethod" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "fortification_level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lostAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Team_isActive_idx" ON "public"."Team"("isActive");
