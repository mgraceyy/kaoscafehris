import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, User } from "lucide-react";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import {
  formatClockTime,
  listAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
} from "./attendance.api";
import AttendanceAdjustDialog from "./attendance-adjust-dialog";

const DATE_RANGE_OPTIONS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
];

function todayIso() { return new Date().toISOString().slice(0, 10); }
function daysAgoIso(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function StatusBadge({ status, hasClockOut }: { status: AttendanceStatus; hasClockOut: boolean }) {
  if (!hasClockOut && (status === "PRESENT" || status === "LATE")) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#FFE4E6", color: "#E11D48" }}>
        Incomplete
      </span>
    );
  }
  switch (status) {
    case "PRESENT": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>Complete</span>;
    case "LATE": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#FEF9C3", color: "#CA8A04" }}>Late</span>;
    case "ABSENT": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>Absent</span>;
    case "HALF_DAY": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>Half-day</span>;
    default: return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
  }
}

export default function AttendancePage() {
  const [dateRangeIdx, setDateRangeIdx] = useState(0);
  const [branchId, setBranchId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "COMPLETE" | "LATE" | "INCOMPLETE" | "ABSENT">("");
  const [adjustTarget, setAdjustTarget] = useState<AttendanceRecord | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
  });

  const startDate = DATE_RANGE_OPTIONS[dateRangeIdx].days === 0
    ? todayIso()
    : daysAgoIso(DATE_RANGE_OPTIONS[dateRangeIdx].days);

  const apiFilters = useMemo(() => ({
    branchId: branchId || undefined,
    startDate,
    endDate: todayIso(),
    status: (statusFilter === "LATE" ? "LATE" : statusFilter === "ABSENT" ? "ABSENT" : undefined) as AttendanceStatus | undefined,
  }), [branchId, startDate, statusFilter]);

  const query = useQuery({
    queryKey: ["attendance", apiFilters],
    queryFn: () => listAttendance(apiFilters),
  });

  const records = useMemo(() => {
    const data = query.data ?? [];
    if (statusFilter === "COMPLETE") return data.filter((r) => r.clockOut && r.status === "PRESENT");
    if (statusFilter === "INCOMPLETE") return data.filter((r) => !r.clockOut && (r.status === "PRESENT" || r.status === "LATE"));
    return data;
  }, [query.data, statusFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Attendance</h1>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Date Range</p>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            value={dateRangeIdx}
            onChange={(e) => setDateRangeIdx(Number(e.target.value))}
          >
            {DATE_RANGE_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Branch</p>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">All Branches</option>
            {branchesQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Status</p>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETE">Complete</option>
            <option value="LATE">Late</option>
            <option value="INCOMPLETE">Incomplete</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Employee</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Branch</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Time In</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Time Out</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-5 py-3.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-red-500">
                  {extractErrorMessage(query.error, "Failed to load attendance")}
                </td>
              </tr>
            )}
            {!query.isLoading && records.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  No records match these filters.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{r.employee.firstName} {r.employee.lastName}</p>
                      <p className="text-xs text-gray-400">{r.employee.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600">{r.branch?.name ?? "—"}</td>
                <td className="px-5 py-4 tabular-nums font-medium text-gray-800">
                  {formatClockTime(r.clockIn)}
                </td>
                <td className="px-5 py-4 tabular-nums text-gray-600">
                  {r.clockOut ? formatClockTime(r.clockOut) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={r.status} hasClockOut={!!r.clockOut} />
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={() => setAdjustTarget(r)}
                    className="text-gray-400 hover:text-primary transition-colors"
                    title="Adjust"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AttendanceAdjustDialog
        open={!!adjustTarget}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
        record={adjustTarget}
      />
    </div>
  );
}
