import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import {
  createEmployee,
  updateEmployee,
  type Employee,
  type EmployeeCreateInput,
  type EmployeeUpdateInput,
} from "./employees.api";

const baseSchema = {
  email: z.string().trim().email("Valid email required"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
  employeeId: z
    .string()
    .trim()
    .min(2, "Employee ID is required")
    .regex(/^[A-Za-z0-9-_]+$/, "Letters, numbers, dash, underscore only"),
  branchId: z.string().uuid("Select a branch"),
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  position: z.string().trim().min(1, "Required"),
  department: z.string().trim().optional(),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE", "TERMINATED", "ON_LEAVE"]),
  dateHired: z.string().min(1, "Required"),
  basicSalary: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .pipe(z.number().positive("Must be greater than zero")),
  phone: z.string().trim().optional(),
} as const;

const createSchema = z.object({
  ...baseSchema,
  password: z.string().min(8, "At least 8 characters"),
});

const editSchema = z.object({
  ...baseSchema,
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, "At least 8 characters"),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;
type FormValues = CreateValues & EditValues;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export default function EmployeeFormDialog({ open, onOpenChange, employee }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!employee;

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: open,
  });

  const resolver = useMemo(
    () => zodResolver(isEdit ? editSchema : createSchema),
    [isEdit]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: resolver as never,
    defaultValues: {
      email: "",
      password: "",
      role: "EMPLOYEE",
      employeeId: "",
      branchId: "",
      firstName: "",
      lastName: "",
      position: "",
      department: "",
      employmentStatus: "ACTIVE",
      dateHired: "",
      basicSalary: 0 as unknown as number,
      phone: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (employee) {
      reset({
        email: employee.user.email,
        password: "",
        role: employee.user.role,
        employeeId: employee.employeeId,
        branchId: employee.branchId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        department: employee.department ?? "",
        employmentStatus: employee.employmentStatus,
        dateHired: employee.dateHired.slice(0, 10),
        basicSalary: parseFloat(employee.basicSalary),
        phone: employee.phone ?? "",
      });
    } else {
      reset({
        email: "",
        password: "",
        role: "EMPLOYEE",
        employeeId: "",
        branchId: "",
        firstName: "",
        lastName: "",
        position: "",
        department: "",
        employmentStatus: "ACTIVE",
        dateHired: "",
        basicSalary: 0 as unknown as number,
        phone: "",
      });
    }
  }, [open, employee, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) {
        const payload: EmployeeUpdateInput = {
          email: values.email,
          role: values.role,
          employeeId: values.employeeId,
          branchId: values.branchId,
          firstName: values.firstName,
          lastName: values.lastName,
          position: values.position,
          department: values.department || undefined,
          employmentStatus: values.employmentStatus,
          dateHired: values.dateHired,
          basicSalary: values.basicSalary,
          phone: values.phone || undefined,
        };
        if (values.password) payload.password = values.password;
        return updateEmployee(employee!.id, payload);
      }
      const payload: EmployeeCreateInput = {
        email: values.email,
        password: values.password!,
        role: values.role,
        employeeId: values.employeeId,
        branchId: values.branchId,
        firstName: values.firstName,
        lastName: values.lastName,
        position: values.position,
        department: values.department || undefined,
        employmentStatus: values.employmentStatus,
        dateHired: values.dateHired,
        basicSalary: values.basicSalary,
        phone: values.phone || undefined,
      };
      return createEmployee(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast(isEdit ? "Employee updated" : "Employee created", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit employee" : "New employee"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update profile and account details."
            : "Create the user login and employee profile together."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-h-[70vh] space-y-4 overflow-y-auto pt-4 pr-1"
        noValidate
      >
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="off" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEdit ? "New password (optional)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? "Leave blank to keep" : ""}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select id="role" {...register("role")}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Branch Manager</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Status</Label>
              <Select id="employmentStatus" {...register("employmentStatus")}>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identity
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" placeholder="KAOS-0003" {...register("employeeId")} />
              {errors.employeeId && (
                <p className="text-xs text-destructive">{errors.employeeId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchId">Branch</Label>
              <Select id="branchId" {...register("branchId")}>
                <option value="">Select branch…</option>
                {branchesQuery.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              {errors.branchId && (
                <p className="text-xs text-destructive">{errors.branchId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+63 9xx xxx xxxx" {...register("phone")} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Employment
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" placeholder="Barista" {...register("position")} />
              {errors.position && (
                <p className="text-xs text-destructive">{errors.position.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" placeholder="Operations" {...register("department")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateHired">Date hired</Label>
              <Input id="dateHired" type="date" {...register("dateHired")} />
              {errors.dateHired && (
                <p className="text-xs text-destructive">{errors.dateHired.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic salary (PHP / month)</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                min="0"
                {...register("basicSalary")}
              />
              {errors.basicSalary && (
                <p className="text-xs text-destructive">{errors.basicSalary.message}</p>
              )}
            </div>
          </div>
        </section>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
