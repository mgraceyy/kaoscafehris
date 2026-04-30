-- AlterEnum
ALTER TYPE "DeductionType" ADD VALUE 'UNPAID_LEAVE';

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "unpaidLeaveDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0;
