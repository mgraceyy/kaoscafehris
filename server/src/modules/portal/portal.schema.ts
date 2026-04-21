import { z } from "zod";

const emptyToUndef = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    s.optional()
  );

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

// Fields the employee is allowed to self-edit. Intentionally excludes
// employment, salary, government IDs, and name — those require admin action.
export const updateProfileSchema = z.object({
  phone: emptyToUndef(z.string().trim().max(30)),
  address: emptyToUndef(z.string().trim().max(255)),
  city: emptyToUndef(z.string().trim().max(100)),
  province: emptyToUndef(z.string().trim().max(100)),
  zipCode: emptyToUndef(z.string().trim().max(20)),
  emergencyName: emptyToUndef(z.string().trim().max(120)),
  emergencyPhone: emptyToUndef(z.string().trim().max(30)),
  emergencyRelation: emptyToUndef(z.string().trim().max(60)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

export const dateRangeQuerySchema = z
  .object({
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
  })
  .refine(
    (v) =>
      !v.startDate ||
      !v.endDate ||
      new Date(v.startDate).getTime() <= new Date(v.endDate).getTime(),
    { message: "startDate must be on or before endDate" }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
