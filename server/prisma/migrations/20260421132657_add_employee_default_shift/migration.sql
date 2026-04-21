-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "defaultShiftTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_defaultShiftTypeId_fkey" FOREIGN KEY ("defaultShiftTypeId") REFERENCES "shift_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
