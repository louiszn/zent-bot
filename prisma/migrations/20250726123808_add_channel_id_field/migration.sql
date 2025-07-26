/*
  Warnings:

  - Added the required column `channelId` to the `RBDMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RBDMessage" ADD COLUMN     "channelId" TEXT NOT NULL;
