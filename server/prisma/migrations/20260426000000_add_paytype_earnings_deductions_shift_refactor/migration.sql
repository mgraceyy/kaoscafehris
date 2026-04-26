-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('MONTHLY_FIXED', 'HOURLY');

-- AlterTable: add payType and hourlyRate to employees
ALTER TABLE "employees"
  ADD COLUMN "payType" "PayType" NOT NULL DEFAULT 'MONTHLY_FIXED',
  ADD COLUMN "hourlyRate" DECIMAL(12,2),
  ALTER COLUMN "basicSalary" SET DEFAULT 0;

-- Refactor shift_types: drop branchId (make shift types global, linked via junction table)
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_defaultShiftTypeId_fkey";
ALTER TABLE "shift_types" DROP CONSTRAINT IF EXISTS "shift_types_branchId_fkey";
DROP INDEX IF EXISTS "shift_types_branchId_idx";
DROP INDEX IF EXISTS "shift_types_branchId_name_key";
ALTER TABLE "shift_types" DROP COLUMN IF EXISTS "branchId";

-- CreateIndex: shift_types.name is now globally unique
CREATE UNIQUE INDEX IF NOT EXISTS "shift_types_name_key" ON "shift_types"("name");

-- Re-add FK from employees to shift_types
ALTER TABLE "employees" ADD CONSTRAINT "employees_defaultShiftTypeId_fkey"
  FOREIGN KEY ("defaultShiftTypeId") REFERENCES "shift_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: shift_type_branches (junction)
CREATE TABLE "shift_type_branches" (
    "shiftTypeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "shift_type_branches_pkey" PRIMARY KEY ("shiftTypeId","branchId")
);

ALTER TABLE "shift_type_branches" ADD CONSTRAINT "shift_type_branches_shiftTypeId_fkey"
  FOREIGN KEY ("shiftTypeId") REFERENCES "shift_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_type_branches" ADD CONSTRAINT "shift_type_branches_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: employee_deductions
CREATE TABLE "employee_deductions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deductionId" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "totalBalance" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_deductions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_deductions_employeeId_deductionId_key" ON "employee_deductions"("employeeId","deductionId");
CREATE INDEX "employee_deductions_employeeId_idx" ON "employee_deductions"("employeeId");

ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_deductionId_fkey"
  FOREIGN KEY ("deductionId") REFERENCES "deductions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: employee_earnings
CREATE TABLE "employee_earnings" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "EarningType" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_earnings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_earnings_employeeId_idx" ON "employee_earnings"("employeeId");

ALTER TABLE "employee_earnings" ADD CONSTRAINT "employee_earnings_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
