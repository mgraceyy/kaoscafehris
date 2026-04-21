-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "shiftTypeId" TEXT;

-- CreateTable
CREATE TABLE "shift_types" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_types_branchId_idx" ON "shift_types"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_types_branchId_name_key" ON "shift_types"("branchId", "name");

-- CreateIndex
CREATE INDEX "shifts_shiftTypeId_idx" ON "shifts"("shiftTypeId");

-- AddForeignKey
ALTER TABLE "shift_types" ADD CONSTRAINT "shift_types_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "shift_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
