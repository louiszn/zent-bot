/*
  Warnings:

  - You are about to drop the `RBDUserCount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "RBDUserCount";

-- CreateTable
CREATE TABLE "RbdUserCount" (
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RbdUserCount_pkey" PRIMARY KEY ("userId")
);
