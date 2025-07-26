/*
  Warnings:

  - You are about to drop the `RBDMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "RBDMessage";

-- CreateTable
CREATE TABLE "RBDUserCount" (
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RBDUserCount_pkey" PRIMARY KEY ("userId")
);
