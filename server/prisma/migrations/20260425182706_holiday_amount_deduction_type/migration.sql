/*
  Warnings:

  - You are about to drop the column `payRatePct` on the `public_holidays` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "deductions" ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "public_holidays" DROP COLUMN "payRatePct",
ADD COLUMN     "amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
