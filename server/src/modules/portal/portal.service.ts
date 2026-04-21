import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  ChangePasswordInput,
  DateRangeQuery,
  UpdateProfileInput,
} from "./portal.schema.js";

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

async function resolveEmployeeIdOrThrow(userId: string): Promise<string> {
  const emp = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!emp) throw new AppError(404, "No employee profile attached to this account");
  return emp.id;
}

// --- Profile --------------------------------------------------------------

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
          gender: true,
          civilStatus: true,
          nationality: true,
          profilePhoto: true,
          phone: true,
          address: true,
          city: true,
          province: true,
          zipCode: true,
          emergencyName: true,
          emergencyPhone: true,
          emergencyRelation: true,
          position: true,
          department: true,
          employmentStatus: true,
          dateHired: true,
          basicSalary: true,
          sssNumber: true,
          philhealthNumber: true,
          pagibigNumber: true,
          tinNumber: true,
          branch: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });
  if (!user) throw new AppError(404, "User not found");
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const employeeId = await resolveEmployeeIdOrThrow(userId);

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      phone: input.phone,
      address: input.address,
      city: input.city,
      province: input.province,
      zipCode: input.zipCode,
      emergencyName: input.emergencyName,
      emergencyPhone: input.emergencyPhone,
      emergencyRelation: input.emergencyRelation,
    },
  });

  return getProfile(userId);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });
  if (!user) throw new AppError(404, "User not found");

  const ok = await bcrypt.compare(input.currentPassword, user.password);
  if (!ok) throw new AppError(400, "Current password is incorrect");

  const hashed = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });
}

export async function updateProfilePhoto(userId: string, photoUrl: string) {
  const employeeId = await resolveEmployeeIdOrThrow(userId);
  await prisma.employee.update({
    where: { id: employeeId },
    data: { profilePhoto: photoUrl },
  });
  return getProfile(userId);
}

// --- Schedule -------------------------------------------------------------

export async function getSchedule(userId: string, query: DateRangeQuery) {
  const employeeId = await resolveEmployeeIdOrThrow(userId);

  const shiftWhere: Prisma.ShiftWhereInput = { status: "PUBLISHED" };
  if (query.startDate || query.endDate) {
    shiftWhere.date = {};
    if (query.startDate) shiftWhere.date.gte = dateOnly(query.startDate);
    if (query.endDate) shiftWhere.date.lte = dateOnly(query.endDate);
  }

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: shiftWhere,
    },
    include: {
      shift: {
        include: {
          branch: { select: { id: true, name: true, city: true } },
        },
      },
    },
    orderBy: [{ shift: { date: "asc" } }, { shift: { startTime: "asc" } }],
  });

  return assignments.map((a) => ({
    assignmentId: a.id,
    shiftId: a.shift.id,
    name: a.shift.name,
    date: a.shift.date,
    startTime: a.shift.startTime,
    endTime: a.shift.endTime,
    branch: a.shift.branch,
  }));
}

// --- Attendance history ---------------------------------------------------

export async function getAttendanceHistory(
  userId: string,
  query: DateRangeQuery
) {
  const employeeId = await resolveEmployeeIdOrThrow(userId);

  const where: Prisma.AttendanceWhereInput = { employeeId };
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = dateOnly(query.startDate);
    if (query.endDate) where.date.lte = dateOnly(query.endDate);
  }

  return prisma.attendance.findMany({
    where,
    select: {
      id: true,
      date: true,
      clockIn: true,
      clockOut: true,
      status: true,
      hoursWorked: true,
      overtimeHours: true,
      lateMinutes: true,
      undertimeMinutes: true,
      remarks: true,
      branch: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { clockIn: "desc" }],
    take: 200,
  });
}
