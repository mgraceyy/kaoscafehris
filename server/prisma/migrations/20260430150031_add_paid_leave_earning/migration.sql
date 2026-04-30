-- AlterEnum
ALTER TYPE "EarningType" ADD VALUE 'PAID_LEAVE';

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "paidLeaveCredits" DECIMAL(12,2) NOT NULL DEFAULT 0;
