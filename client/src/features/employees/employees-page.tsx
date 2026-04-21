import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, Pencil, Search } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import {
  getImportTemplateUrl,
  importEmployeesCsv,
  listEmployees,
  type Employee,
  type EmploymentStatus,
  type ImportResult,
} from "./employees.api";
import EmployeeFormDialog from "./employee-form-dialog";

const BRAND = "#8C1515";

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

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEmployee, setDialogEmployee] = useState<Employee | null>(null);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        <div className="flex items-center gap-2">
          <a href={getImportTemplateUrl()} download>
            <button className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Template
            </button>
          </a>
          <button
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending || !hasBranches}
            title={!hasBranches ? "Add at least one branch before importing employees" : ""}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            + Import
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
            onClick={() => { setDialogEmployee(null); setDialogOpen(true); }}
            className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
            disabled={!hasBranches}
            title={!hasBranches ? "Add at least one branch before creating employees" : ""}
          >
            + Add Employee
          </button>
        </div>
      </div>

      {!hasBranches && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-medium">⚠ No branches available</p>
          <p className="text-xs mt-1">Please create at least one branch before adding or importing employees.</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All Branches</option>
          {branchesQuery.data?.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
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
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Employee ID</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Name</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Role</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Branch</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employeesQuery.isLoading && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {employeesQuery.isError && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-red-500">
                  {extractErrorMessage(employeesQuery.error, "Failed to load employees")}
                </td>
              </tr>
            )}
            {!employeesQuery.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  No employees match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4 font-mono text-xs text-gray-500">{e.employeeId}</td>
                <td className="px-5 py-4 font-semibold text-gray-800">
                  {e.firstName} {e.lastName}
                </td>
                <td className="px-5 py-4 text-gray-600">{e.position}</td>
                <td className="px-5 py-4 text-gray-600">{e.branch?.name ?? "—"}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={e.employmentStatus} />
                </td>
                <td className="px-5 py-4">
                  <button
                    className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: BRAND }}
                    onClick={() => { setDialogEmployee(e); setDialogOpen(true); }}
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

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={dialogEmployee}
      />
    </div>
  );
}
