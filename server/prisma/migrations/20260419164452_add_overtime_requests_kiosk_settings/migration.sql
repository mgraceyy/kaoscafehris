-- CreateEnum
CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "shift_assignments" ADD COLUMN     "overtimeApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeApprovedBy" TEXT;

-- CreateTable
CREATE TABLE "overtime_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "OvertimeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_requests_employeeId_status_idx" ON "overtime_requests"("employeeId", "status");

-- CreateIndex
CREATE INDEX "overtime_requests_date_idx" ON "overtime_requests"("date");

-- AddForeignKey
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
