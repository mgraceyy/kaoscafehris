-- AlterTable
ALTER TABLE "overtime_requests" ADD COLUMN     "otHours" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "overtime_schedules" ADD COLUMN     "otHours" DECIMAL(5,2);
