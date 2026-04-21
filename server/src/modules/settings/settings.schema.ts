import { z } from "zod";

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const settingValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.any()),
  z.record(z.string(), z.any()),
]);

export const listSettingsQuerySchema = z.object({
  group: z.string().trim().min(1).optional(),
});

export const updateSettingSchema = z.object({
  value: settingValue,
  group: z.preprocess(emptyToUndef, z.string().trim().max(60).optional()),
});

export const bulkUpdateSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(100),
        value: settingValue,
        group: z.preprocess(emptyToUndef, z.string().trim().max(60).optional()),
      })
    )
    .min(1, "At least one setting is required"),
});

export const govTableTypeSchema = z.enum(["SSS", "PHILHEALTH", "PAGIBIG", "BIR"]);

export const listGovTablesQuerySchema = z.object({
  type: govTableTypeSchema.optional(),
});

export const upsertGovTableSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: govTableTypeSchema,
    rangeFrom: z.number().nonnegative(),
    rangeTo: z.number().positive(),
    employeeShare: z.number().nonnegative(),
    employerShare: z.number().nonnegative(),
    effectiveDate: isoDate,
  })
  .refine((v) => v.rangeTo >= v.rangeFrom, {
    message: "rangeTo must be greater than or equal to rangeFrom",
    path: ["rangeTo"],
  });

export type ListSettingsQuery = z.infer<typeof listSettingsQuerySchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type ListGovTablesQuery = z.infer<typeof listGovTablesQuerySchema>;
export type UpsertGovTableInput = z.infer<typeof upsertGovTableSchema>;
export type GovTableType = z.infer<typeof govTableTypeSchema>;
