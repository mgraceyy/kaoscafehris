import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const generateShiftsSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  startDate: isoDate,
  endDate: isoDate,
  excludeWeekendsAndHolidays: z.boolean().default(true),
});

export type GenerateShiftsInput = z.infer<typeof generateShiftsSchema>;
