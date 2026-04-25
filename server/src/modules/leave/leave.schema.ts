import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const leaveTypeEnum = z.enum([
  "VACATION",
  "SICK",
  "EMERGENCY",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
]);

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string().uuid(),
    leaveType: leaveTypeEnum,
    startDate: isoDate,
    endDate: isoDate,
    totalDays: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? Number(v) : v))
      .pipe(z.number().positive().max(365)),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const reviewLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

export const listLeaveQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  leaveType: leaveTypeEnum.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

export const upsertLeaveBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveType: leaveTypeEnum,
  year: z.number().int().min(2020).max(2100),
  totalDays: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().min(0).max(365)),
});

export const upsertBalanceForAllSchema = z.object({
  leaveType: leaveTypeEnum,
  year: z.number().int().min(2020).max(2100),
  totalDays: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().min(0).max(365)),
});

export const listLeaveBalancesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  year: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(2020).max(2100).optional()),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
export type ListLeaveQuery = z.infer<typeof listLeaveQuerySchema>;
export type UpsertLeaveBalanceInput = z.infer<typeof upsertLeaveBalanceSchema>;
export type UpsertBalanceForAllInput = z.infer<typeof upsertBalanceForAllSchema>;
export type ListLeaveBalancesQuery = z.infer<typeof listLeaveBalancesQuerySchema>;
