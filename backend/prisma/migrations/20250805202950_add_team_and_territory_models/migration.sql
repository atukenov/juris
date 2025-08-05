-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Territory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundary" JSONB NOT NULL,
    "centerPoint" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TerritoryCapture" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "capturedByUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryCapture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "public"."Team"("name");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "public"."Team"("ownerId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "public"."TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "public"."TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "public"."TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "Territory_boundary_idx" ON "public"."Territory"("boundary");

-- CreateIndex
CREATE INDEX "Territory_centerPoint_idx" ON "public"."Territory"("centerPoint");

-- CreateIndex
CREATE INDEX "TerritoryCapture_territoryId_idx" ON "public"."TerritoryCapture"("territoryId");

-- CreateIndex
CREATE INDEX "TerritoryCapture_teamId_idx" ON "public"."TerritoryCapture"("teamId");

-- CreateIndex
CREATE INDEX "TerritoryCapture_isActive_idx" ON "public"."TerritoryCapture"("isActive");

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerritoryCapture" ADD CONSTRAINT "TerritoryCapture_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "public"."Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerritoryCapture" ADD CONSTRAINT "TerritoryCapture_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TerritoryCapture" ADD CONSTRAINT "TerritoryCapture_capturedByUserId_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
