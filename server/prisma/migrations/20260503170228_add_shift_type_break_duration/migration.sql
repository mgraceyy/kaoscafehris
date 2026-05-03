-- AlterTable
ALTER TABLE "shift_types" ADD COLUMN     "breakDuration" INTEGER NOT NULL DEFAULT 60;

-- CreateIndex
CREATE INDEX "attendance_records_employeeId_date_idx" ON "attendance_records"("employeeId", "date");
