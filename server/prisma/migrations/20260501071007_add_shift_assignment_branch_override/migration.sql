-- AlterTable
ALTER TABLE "shift_assignments" ADD COLUMN     "assignedBranchId" TEXT;

-- CreateIndex
CREATE INDEX "shift_assignments_assignedBranchId_idx" ON "shift_assignments"("assignedBranchId");

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_assignedBranchId_fkey" FOREIGN KEY ("assignedBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
