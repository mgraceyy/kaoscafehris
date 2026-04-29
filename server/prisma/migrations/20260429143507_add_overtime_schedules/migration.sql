-- CreateTable
CREATE TABLE "overtime_schedules" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_schedules_employeeId_idx" ON "overtime_schedules"("employeeId");

-- CreateIndex
CREATE INDEX "overtime_schedules_date_idx" ON "overtime_schedules"("date");

-- AddForeignKey
ALTER TABLE "overtime_schedules" ADD CONSTRAINT "overtime_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
