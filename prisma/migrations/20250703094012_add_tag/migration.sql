-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "tag" TEXT NOT NULL DEFAULT 'temp-tag',
ALTER COLUMN "name" DROP NOT NULL;
