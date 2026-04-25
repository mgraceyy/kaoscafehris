import { z } from "zod";

const emptyToUndef = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    s.optional()
  );

const dateLike = z.preprocess((v) => {
  if (v instanceof Date) return v;
  if (typeof v === "string" && v.trim() !== "") return new Date(v);
  return undefined;
}, z.date().optional());

const requiredDate = z.preprocess(
  (v) => (v instanceof Date ? v : typeof v === "string" ? new Date(v) : v),
  z.date({ required_error: "Date is required", invalid_type_error: "Invalid date" })
);

const roleEnum = z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE");
const employmentStatusEnum = z.enum(["ACTIVE", "INACTIVE", "TERMINATED", "ON_LEAVE"]);

export const createEmployeeSchema = z.object({
  // User account
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: roleEnum,

  // Employee identity
  employeeId: z
    .string()
    .trim()
    .min(2, "Employee ID is required")
    .max(30)
    .regex(/^[A-Za-z0-9-_]+$/, "Letters, numbers, dash, underscore only"),
  branchId: z.string().uuid("Invalid branch"),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  middleName: emptyToUndef(z.string().trim().max(60)),

  dateOfBirth: dateLike,
  gender: emptyToUndef(z.string().trim().max(30)),
  civilStatus: emptyToUndef(z.string().trim().max(30)),
  nationality: emptyToUndef(z.string().trim().max(60)),

  phone: emptyToUndef(z.string().trim().max(30)),
  address: emptyToUndef(z.string().trim().max(255)),
  city: emptyToUndef(z.string().trim().max(100)),
  province: emptyToUndef(z.string().trim().max(100)),
  zipCode: emptyToUndef(z.string().trim().max(20)),

  emergencyName: emptyToUndef(z.string().trim().max(120)),
  emergencyPhone: emptyToUndef(z.string().trim().max(30)),
  emergencyRelation: emptyToUndef(z.string().trim().max(60)),

  position: z.string().trim().min(1).max(100),
  employmentStatus: employmentStatusEnum.default("ACTIVE"),
  dateHired: requiredDate,
  basicSalary: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().positive("Salary must be greater than zero").max(10_000_000)),

  sssNumber: emptyToUndef(z.string().trim().max(30)),
  philhealthNumber: emptyToUndef(z.string().trim().max(30)),
  pagibigNumber: emptyToUndef(z.string().trim().max(30)),
  tinNumber: emptyToUndef(z.string().trim().max(30)),
});

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .extend({
    // On update, password is optional; if present it resets the account password.
    password: z.string().min(8).max(128).optional(),
    // Email + role are properties of the User row; allow change but not required.
    email: z.string().trim().toLowerCase().email().optional(),
    role: roleEnum.optional(),
    isActive: z.boolean().optional(), // toggle user account active flag
  });

export const listEmployeeQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().uuid().optional(),
  status: employmentStatusEnum.optional(),
  role: roleEnum.optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeeQuery = z.infer<typeof listEmployeeQuerySchema>;
