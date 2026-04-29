import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const createOvertimeSchema = z.object({
  shiftId: z.string().uuid().optional(),
  date: isoDate,
  reason: z.string().trim().min(1).max(500),
});

export const reviewOvertimeSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

export const listOvertimeQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

export const approveShiftOvertimeSchema = z.object({
  overtimeApproved: z.boolean(),
});

export const createScheduleSchema = z.object({
  employeeId: z.string().uuid(),
  date: isoDate,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  notes: z.string().trim().max(500).optional(),
});

export const updateScheduleSchema = createScheduleSchema.partial().omit({ employeeId: true });

export const listSchedulesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

export type CreateOvertimeInput = z.infer<typeof createOvertimeSchema>;
export type ReviewOvertimeInput = z.infer<typeof reviewOvertimeSchema>;
export type ListOvertimeQuery = z.infer<typeof listOvertimeQuerySchema>;
export type ApproveShiftOvertimeInput = z.infer<typeof approveShiftOvertimeSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;
