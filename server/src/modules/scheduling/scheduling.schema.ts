import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM (24h)");

export const createShiftSchema = z
  .object({
    branchId: z.string().uuid(),
    shiftTypeId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(60),
    date: isoDate,
    startTime: time.optional(),
    endTime: time.optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    employeeIds: z.array(z.string().uuid()).optional().default([]),
  })
  .refine(
    (v) => {
      // Either shiftTypeId must be provided, or both startTime and endTime must be provided
      if (v.shiftTypeId) return true;
      return v.startTime && v.endTime && v.startTime !== v.endTime;
    },
    { message: "Either select a shift type or provide both start and end times", path: ["startTime"] }
  );

export const updateShiftSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  date: isoDate.optional(),
  startTime: time.optional(),
  endTime: time.optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const assignEmployeesSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "Pick at least one employee"),
});

export const listShiftsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type AssignEmployeesInput = z.infer<typeof assignEmployeesSchema>;
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
