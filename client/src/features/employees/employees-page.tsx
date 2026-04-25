import { useRef, useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, Pencil, Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import {
  getImportTemplateUrl,
  importEmployeesCsv,
  listEmployees,
  createEmployee,
  updateEmployee,
  type Employee,
  type EmploymentStatus,
  type ImportResult,
  type EmployeeCreateInput,
  type EmployeeUpdateInput,
} from "./employees.api";

const BRAND = "#8C1515";

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

function StatusBadge({ status }: { status: EmploymentStatus }) {
  const map: Record<EmploymentStatus, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "#DCFCE7", color: "#16A34A", label: "Active" },
    ON_LEAVE: { bg: "#FEF3C7", color: "#D97706", label: "On Leave" },
    INACTIVE: { bg: "#F3F4F6", color: "#6B7280", label: "Inactive" },
    TERMINATED: { bg: "#FEE2E2", color: "#DC2626", label: "Terminated" },
  };
  const s = map[status] ?? map.INACTIVE;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getInitialsBgColor(firstName: string, lastName: string) {
  const colors = [
    "#FED7AA",
    "#C7D2FE",
    "#FBCFE8",
    "#A7F3D0",
    "#FCA5A5",
  ];
  const initials = getInitials(firstName, lastName);
  const charCode = initials.charCodeAt(0) + initials.charCodeAt(1);
  return colors[charCode % colors.length];
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState("");
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const isEdit = !!detailEmployee;

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
      email: "", password: "", role: "EMPLOYEE", employeeId: "",
      branchId: "", firstName: "", lastName: "", position: "",
      department: "", employmentStatus: "ACTIVE", dateHired: "",
      basicSalary: 0 as unknown as number, phone: "",
    },
  });

  useEffect(() => {
    if (!isEditMode) return;
    if (detailEmployee) {
      reset({
        email: detailEmployee.user.email,
        password: "",
        role: detailEmployee.user.role,
        employeeId: detailEmployee.employeeId,
        branchId: detailEmployee.branchId,
        firstName: detailEmployee.firstName,
        lastName: detailEmployee.lastName,
        position: detailEmployee.position,
        department: detailEmployee.department ?? "",
        employmentStatus: detailEmployee.employmentStatus,
        dateHired: detailEmployee.dateHired.slice(0, 10),
        basicSalary: parseFloat(detailEmployee.basicSalary),
        phone: detailEmployee.phone ?? "",
      });
    } else {
      reset({
        email: "", password: "", role: "EMPLOYEE", employeeId: "",
        branchId: "", firstName: "", lastName: "", position: "",
        department: "", employmentStatus: "ACTIVE", dateHired: "",
        basicSalary: 0 as unknown as number, phone: "",
      });
    }
  }, [isEditMode, detailEmployee, reset]);

  const formMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) {
        const payload: EmployeeUpdateInput = {
          email: values.email, role: values.role, employeeId: values.employeeId,
          branchId: values.branchId, firstName: values.firstName,
          lastName: values.lastName, position: values.position,
          department: values.department || undefined,
          employmentStatus: values.employmentStatus, dateHired: values.dateHired,
          basicSalary: values.basicSalary, phone: values.phone || undefined,
        };
        if (values.password) payload.password = values.password;
        return updateEmployee(detailEmployee!.id, payload);
      }
      const payload: EmployeeCreateInput = {
        email: values.email, password: values.password!,
        role: values.role, employeeId: values.employeeId,
        branchId: values.branchId, firstName: values.firstName,
        lastName: values.lastName, position: values.position,
        department: values.department || undefined,
        employmentStatus: values.employmentStatus, dateHired: values.dateHired,
        basicSalary: values.basicSalary, phone: values.phone || undefined,
      };
      return createEmployee(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast(isEdit ? "Employee updated" : "Employee created", "success");
      setIsEditMode(false);
      setDetailEmployee(null);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", { search, branchId }],
    queryFn: () => listEmployees({ search: search || undefined, branchId: branchId || undefined }),
  });


  const importMutation = useMutation({
    mutationFn: (file: File) => importEmployeesCsv(file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setImportResult(result);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  // Filter by role client-side since API may not support it
  const filtered = (employeesQuery.data ?? []).filter((e) => {
    if (role && e.user.role !== role) return false;
    return true;
  });

  const hasBranches = (branchesQuery.data?.length ?? 0) > 0;

  const stats = {
    total: filtered.length,
    active: filtered.filter(e => e.employmentStatus === "ACTIVE").length,
    onLeave: filtered.filter(e => e.employmentStatus === "ON_LEAVE").length,
    inactive: filtered.filter(e => e.employmentStatus === "INACTIVE").length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between animate-fade-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">People</p>
          <h1 className="font-heading text-3xl text-gray-900">Employees</h1>
          <p className="text-sm text-gray-400 mt-1">{filtered.length} employees · {branchesQuery.data?.length ?? 0} branches</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={getImportTemplateUrl()} download>
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Template
            </button>
          </a>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending || !hasBranches}
            title={!hasBranches ? "Add at least one branch before importing employees" : ""}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            + Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
            }}
          />
          <button
            onClick={() => { setDetailEmployee(null); setIsEditMode(true); }}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
            disabled={!hasBranches}
            title={!hasBranches ? "Add at least one branch before creating employees" : ""}
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="animate-fade-up stagger-1 relative overflow-hidden rounded-xl bg-white p-4 shadow-sm card-hover" style={{ borderLeft: `4px solid ${BRAND}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Total</p>
          <p className="font-heading text-4xl leading-none" style={{ color: BRAND }}>{stats.total}</p>
        </div>
        <div className="animate-fade-up stagger-2 relative overflow-hidden rounded-xl bg-white p-4 shadow-sm card-hover" style={{ borderLeft: "4px solid #16A34A" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Active</p>
          <p className="font-heading text-4xl leading-none text-green-600">{stats.active}</p>
        </div>
        <div className="animate-fade-up stagger-3 relative overflow-hidden rounded-xl bg-white p-4 shadow-sm card-hover" style={{ borderLeft: "4px solid #9CA3AF" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Inactive</p>
          <p className="font-heading text-4xl leading-none text-gray-400">{stats.inactive}</p>
        </div>
      </div>

      {!hasBranches && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-medium">⚠ No branches available</p>
          <p className="text-xs mt-1">Please create at least one branch before adding or importing employees.</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm animate-fade-up stagger-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All Branches</option>
          {branchesQuery.data?.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>

      {/* Table */}
      <div className="animate-fade-up stagger-5 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #F5EDED", backgroundColor: "#FDFAFA" }}>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Employee ID</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Name</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Position</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Branch</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Role</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Status</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
            {employeesQuery.isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {employeesQuery.isError && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-red-500">
                  {extractErrorMessage(employeesQuery.error, "Failed to load employees")}
                </td>
              </tr>
            )}
            {!employeesQuery.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  No employees match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="transition-colors hover:bg-[#FAF5F5]"
                style={{ borderBottom: "1px solid #F5EDED" }}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-gray-700"
                      style={{ backgroundColor: getInitialsBgColor(e.firstName, e.lastName) }}
                    >
                      {getInitials(e.firstName, e.lastName)}
                    </div>
                    <span className="font-mono text-xs font-semibold" style={{ color: BRAND }}>{e.employeeId}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold text-gray-800">
                  {e.firstName} {e.lastName}
                </td>
                <td className="px-5 py-4 text-gray-600">{e.position}</td>
                <td className="px-5 py-4 font-medium" style={{ color: BRAND }}>{e.branch?.name ?? "—"}</td>
                <td className="px-5 py-4 text-gray-600 capitalize">{e.user.role.toLowerCase()}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={e.employmentStatus} />
                </td>
                <td className="px-5 py-4">
                  <button
                    className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: BRAND }}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      setDetailEmployee(e);
                      setIsEditMode(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importResult && (
        <div className="mt-4 rounded-2xl bg-white p-5 text-sm shadow-sm border border-gray-100">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <p className="font-semibold text-gray-800">Import Summary</p>
            <button className="text-xs text-gray-400 hover:text-gray-600 underline shrink-0" onClick={() => setImportResult(null)}>Dismiss</button>
          </div>

          {/* Stats */}
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              ✓ {importResult.created} added successfully
            </span>
            {importResult.skipped > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                ⚠ {importResult.skipped} skipped — already exist in the system
              </span>
            )}
            {importResult.failed.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                ✕ {importResult.failed.length} failed
              </span>
            )}
          </div>

          {/* Failed rows detail */}
          {importResult.failed.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Errors — please fix these rows and re-import</p>
              <ul className="space-y-2">
                {importResult.failed.map((f) => (
                  <li key={f.row} className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <span className="font-semibold shrink-0">Row {f.row}:</span>
                    <span>{f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Slide Panel (Add/Edit Form) */}
      {isEditMode && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={() => { setDetailEmployee(null); setIsEditMode(false); }} />
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Employee" : "Add New Employee"}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{isEdit ? "Update profile and account details." : "Create the user login and employee profile."}</p>
              </div>
              <button onClick={() => { setIsEditMode(false); setDetailEmployee(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((v) => formMutation.mutate(v))} noValidate className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* ACCOUNT */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: BRAND }}>Account</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee ID *</label>
                      <input {...register("employeeId")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">System Role *</label>
                      <select {...register("role")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400 bg-white">
                        <option value="EMPLOYEE">Employee</option>
                        <option value="MANAGER">Branch Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{isEdit ? "New Password (Optional)" : "Password *"}</label>
                      <input {...register("password")} type="password" placeholder={isEdit ? "Leave blank to keep" : "Min. 8 characters"} autoComplete="new-password" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employment Status *</label>
                      <select {...register("employmentStatus")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400 bg-white">
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="TERMINATED">Terminated</option>
                      </select>
                      {errors.employmentStatus && <p className="text-xs text-red-500 mt-1">{errors.employmentStatus.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                      <input {...register("email")} type="email" placeholder="employee@kaoscafe.com" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                  </div>
                </div>

                {/* IDENTITY */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: BRAND }}>Identity</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">First Name *</label>
                      <input {...register("firstName")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Middle Name</label>
                      <input placeholder="Optional" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Name *</label>
                      <input {...register("lastName")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                      <input {...register("phone")} placeholder="+63 9xx xxx xxxx" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                    </div>
                  </div>
                </div>

                {/* EMPLOYMENT */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: BRAND }}>Employment</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Branch *</label>
                      <select {...register("branchId")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400 bg-white">
                        <option value="">Select branch...</option>
                        {branchesQuery.data?.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Position / Job Title *</label>
                      <input {...register("position")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Hired *</label>
                      <input {...register("dateHired")} type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.dateHired && <p className="text-xs text-red-500 mt-1">{errors.dateHired.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Basic Salary (PHP/Month) *</label>
                      <input {...register("basicSalary")} type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                      {errors.basicSalary && <p className="text-xs text-red-500 mt-1">{errors.basicSalary.message}</p>}
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
                <button type="button" onClick={() => { setIsEditMode(false); setDetailEmployee(null); }} className="flex-1 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formMutation.isPending} className="flex-1 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60" style={{ backgroundColor: BRAND }}>
                  {formMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  {isEdit ? "Save Changes" : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
