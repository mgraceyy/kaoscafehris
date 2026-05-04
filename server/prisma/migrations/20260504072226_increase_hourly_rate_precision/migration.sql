/*
  Warnings:

  - You are about to alter the column `hourlyRate` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.

*/
-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "hourlyRate" SET DATA TYPE DECIMAL(12,4);
