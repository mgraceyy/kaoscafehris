import { z } from "zod";

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const actionSchema = z.enum(["CREATE", "UPDATE", "DELETE"]);

export const listAuditLogsQuerySchema = z.object({
  userId: z.preprocess(emptyToUndef, z.string().uuid().optional()),
  action: z.preprocess(emptyToUndef, actionSchema.optional()),
  tableName: z.preprocess(emptyToUndef, z.string().trim().min(1).max(60).optional()),
  recordId: z.preprocess(emptyToUndef, z.string().trim().min(1).optional()),
  startDate: z.preprocess(emptyToUndef, isoDate.optional()),
  endDate: z.preprocess(emptyToUndef, isoDate.optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
