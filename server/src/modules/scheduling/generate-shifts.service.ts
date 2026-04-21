import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
import type { GenerateShiftsInput } from "./generate-shifts.schema.js";
import { eachDayOfInterval, isWeekend, parse } from "date-fns";

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function generateShifts(input: GenerateShiftsInput, userId?: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
  });
  if (!branch) {
    throw new AppError(404, "Branch not found");
  }

  // Get all active employees with default shift in this branch
  const employees = await prisma.employee.findMany({
    where: {
      branchId: input.branchId,
      employmentStatus: "ACTIVE",
      defaultShiftTypeId: { not: null },
    },
    include: { defaultShiftType: true },
  });

  if (employees.length === 0) {
    throw new AppError(400, "No active employees with default shift found in this branch");
  }

  // Get public holidays in date range
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: {
        gte: dateOnly(input.startDate),
        lte: dateOnly(input.endDate),
      },
    },
    select: { date: true },
  });

  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10))
  );

  // Generate date range
  const startDate = parse(input.startDate, "yyyy-MM-dd", new Date());
  const endDate = parse(input.endDate, "yyyy-MM-dd", new Date());
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  let shiftsCreated = 0;
  const errors: string[] = [];

  // For each day in range
  for (const day of dateRange) {
    const dayIso = day.toISOString().slice(0, 10);

    // Skip weekends if requested
    if (input.excludeWeekendsAndHolidays && isWeekend(day)) {
      continue;
    }

    // Skip holidays if requested
    if (input.excludeWeekendsAndHolidays && holidayDates.has(dayIso)) {
      continue;
    }

    // For each employee with default shift
    for (const employee of employees) {
      if (!employee.defaultShiftType) continue;

      try {
        // Check if shift already exists for this employee on this day
        const existingShift = await prisma.shift.findFirst({
          where: {
            branchId: input.branchId,
            date: dateOnly(dayIso),
            shiftTypeId: employee.defaultShiftTypeId,
            assignments: {
              some: { employeeId: employee.id },
            },
          },
        });

        if (existingShift) {
          // Skip if already exists
          continue;
        }

        // Check if any shift exists for this employee on this day
        const conflictingShift = await prisma.shift.findFirst({
          where: {
            date: dateOnly(dayIso),
            assignments: {
              some: { employeeId: employee.id },
            },
          },
        });

        if (conflictingShift) {
          // Skip if employee already assigned to a different shift
          continue;
        }

        // Create shift and assign employee
        await prisma.shift.create({
          data: {
            branchId: input.branchId,
            shiftTypeId: employee.defaultShiftTypeId,
            name: employee.defaultShiftType.name,
            date: dateOnly(dayIso),
            startTime: employee.defaultShiftType.startTime,
            endTime: employee.defaultShiftType.endTime,
            status: "PUBLISHED",
            assignments: {
              create: [{ employeeId: employee.id }],
            },
          },
        });

        shiftsCreated++;
      } catch (err) {
        errors.push(`Failed to create shift for ${employee.firstName} ${employee.lastName} on ${dayIso}: ${err}`);
      }
    }
  }

  // Log audit
  await logAudit({
    userId,
    action: "CREATE",
    tableName: "shifts",
    recordId: "bulk-generate",
    newValues: {
      branchId: input.branchId,
      dateRange: `${input.startDate} to ${input.endDate}`,
      shiftsCreated,
      excludeWeekendsAndHolidays: input.excludeWeekendsAndHolidays,
    },
  });

  return {
    shiftsCreated,
    errors,
    message: `Generated ${shiftsCreated} shifts${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
  };
}
