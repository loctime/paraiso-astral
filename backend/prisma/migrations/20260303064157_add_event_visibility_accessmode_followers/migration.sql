-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventAccessMode" AS ENUM ('REGISTERED', 'HAS_TICKET', 'FOLLOWER');

-- CreateEnum
CREATE TYPE "FollowerScope" AS ENUM ('ORGANIZATION', 'EVENT');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "accessMode" "EventAccessMode" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "followerScope" "FollowerScope" NOT NULL DEFAULT 'ORGANIZATION',
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerUserId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ownerUserId" TEXT;

-- CreateTable
CREATE TABLE "OrganizationFollower" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationFollower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFollower" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFollower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationFollower_userId_createdAt_idx" ON "OrganizationFollower"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFollower_organizationId_userId_key" ON "OrganizationFollower"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "EventFollower_userId_createdAt_idx" ON "EventFollower"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventFollower_eventId_userId_key" ON "EventFollower"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Event_organizationId_visibility_startAt_idx" ON "Event"("organizationId", "visibility", "startAt");

-- CreateIndex
CREATE INDEX "Event_organizationId_visibility_status_idx" ON "Event"("organizationId", "visibility", "status");

-- CreateIndex
CREATE INDEX "Order_eventId_buyerUserId_idx" ON "Order"("eventId", "buyerUserId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_ownerUserId_status_idx" ON "Ticket"("eventId", "ownerUserId", "status");

-- AddForeignKey
ALTER TABLE "OrganizationFollower" ADD CONSTRAINT "OrganizationFollower_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFollower" ADD CONSTRAINT "OrganizationFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFollower" ADD CONSTRAINT "EventFollower_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFollower" ADD CONSTRAINT "EventFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
