import { z } from "zod";

const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM (24h)");

export const createShiftTypeSchema = z
  .object({
    branchId: z.string().uuid("Invalid branch ID"),
    name: z.string().trim().min(1, "Name is required").max(60, "Name must be 60 characters or less"),
    startTime: time,
    endTime: time,
  })
  .refine(
    (v) => v.startTime !== v.endTime,
    { message: "Start and end time cannot be equal", path: ["endTime"] }
  );

export const updateShiftTypeSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  startTime: time.optional(),
  endTime: time.optional(),
}).refine(
  (v) => {
    if (v.startTime && v.endTime) {
      return v.startTime !== v.endTime;
    }
    return true;
  },
  { message: "Start and end time cannot be equal", path: ["endTime"] }
);

export const listShiftTypesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

export type CreateShiftTypeInput = z.infer<typeof createShiftTypeSchema>;
export type UpdateShiftTypeInput = z.infer<typeof updateShiftTypeSchema>;
export type ListShiftTypesQuery = z.infer<typeof listShiftTypesQuerySchema>;
