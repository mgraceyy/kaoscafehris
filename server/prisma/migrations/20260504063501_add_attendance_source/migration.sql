-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('KIOSK', 'MANUAL');

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "source" "AttendanceSource" NOT NULL DEFAULT 'KIOSK';
