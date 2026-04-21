import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const dateRangeQuerySchema = z
  .object({
    branchId: z.string().uuid().optional(),
    periodStart: isoDate.optional(),
    periodEnd: isoDate.optional(),
  })
  .refine(
    (v) =>
      !v.periodStart ||
      !v.periodEnd ||
      new Date(v.periodStart).getTime() <= new Date(v.periodEnd).getTime(),
    { message: "periodStart must be on or before periodEnd" }
  );

export const headcountQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

export const exportParamSchema = z.object({
  type: z.enum(["attendance", "payroll", "headcount"]),
});

export const exportQuerySchema = dateRangeQuerySchema.and(
  z.object({ format: z.enum(["pdf", "xlsx"]).default("xlsx") })
);

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type HeadcountQuery = z.infer<typeof headcountQuerySchema>;
export type ExportParam = z.infer<typeof exportParamSchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
