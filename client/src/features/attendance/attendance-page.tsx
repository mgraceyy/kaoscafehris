import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Pencil, Plus, Search } from "lucide-react";
import { extractErrorMessage } from "@/lib/api";
import { exportToCsv } from "@/lib/export";
import { listBranches } from "@/features/branches/branches.api";
import { listSettings } from "@/features/settings/settings.api";
import {
  formatClockTime,
  listAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
} from "./attendance.api";
import AttendanceAdjustDialog from "./attendance-adjust-dialog";
import AttendanceAddDialog from "./attendance-add-dialog";

const BRAND = "#8C1515";
const AMBER = "#C4843A";
const PURPLE = "#7a3db0";
const GREEN = "#4e8a40";

const DATE_RANGE_OPTIONS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
];

function localDateIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseSplitTime(raw: string): { hour: number; minute: number } {
  const hhmm = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return { hour: parseInt(hhmm[1], 10), minute: parseInt(hhmm[2], 10) };
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!ampm) return { hour: 8, minute: 0 };
  let hour = parseInt(ampm[1], 10);
  const minute = parseInt(ampm[2], 10);
  if (ampm[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  if (ampm[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  return { hour, minute };
}

function workDayIso(splitHour: number, splitMinute: number, offsetDays = 0): string {
  const now = new Date();
  const beforeSplit = now.getHours() < splitHour || (now.getHours() === splitHour && now.getMinutes() < splitMinute);
  const base = new Date(now);
  if (beforeSplit) base.setDate(base.getDate() - 1);
  if (offsetDays) base.setDate(base.getDate() - offsetDays);
  return localDateIso(base);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


function StatusBadge({ status, hasClockOut }: { status: AttendanceStatus; hasClockOut: boolean }) {
  if (!hasClockOut && (status === "PRESENT" || status === "LATE")) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#fce9e9", color: BRAND }}>
          Ongoing
        </span>
        {status === "LATE" && (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#fdf0e0", color: AMBER }}>
            Late
          </span>
        )}
      </span>
    );
  }
  switch (status) {
    case "PRESENT": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#edf6ea", color: GREEN }}>On Time</span>;
    case "LATE": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#fdf0e0", color: AMBER }}>Late</span>;
    case "ABSENT": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#fce9e9", color: BRAND }}>Absent</span>;
    case "HALF_DAY": return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#f3e8ff", color: PURPLE }}>On Leave</span>;
    default: return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
  }
}

function dateLabel(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function AttendancePage() {
  const [dateRangeIdx, setDateRangeIdx] = useState(0);
  const [branchId, setBranchId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "COMPLETE" | "LATE" | "INCOMPLETE" | "ABSENT">("");
  const [search, setSearch] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<AttendanceRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", "company"],
    queryFn: () => listSettings("company"),
    staleTime: 5 * 60_000,
  });

  const { hour: splitHour, minute: splitMinute } = useMemo(() => {
    const raw = settingsQuery.data?.find((s) => s.key === "company.default_work_hours")?.value as string | undefined;
    return parseSplitTime(raw ?? "08:00");
  }, [settingsQuery.data]);

  const todayWorkDay = workDayIso(splitHour, splitMinute);

  const startDate = DATE_RANGE_OPTIONS[dateRangeIdx].days === 0
    ? todayWorkDay
    : workDayIso(splitHour, splitMinute, DATE_RANGE_OPTIONS[dateRangeIdx].days);

  const apiFilters = useMemo(() => ({
    branchId: branchId || undefined,
    startDate,
    endDate: todayWorkDay,
    status: (statusFilter === "LATE" ? "LATE" : statusFilter === "ABSENT" ? "ABSENT" : undefined) as AttendanceStatus | undefined,
  }), [branchId, startDate, todayWorkDay, statusFilter]);

  const query = useQuery({
    queryKey: ["attendance", apiFilters],
    queryFn: () => listAttendance(apiFilters),
  });

  const records = useMemo(() => {
    let data = query.data ?? [];
    if (statusFilter === "COMPLETE") data = data.filter((r) => r.clockOut && r.status === "PRESENT");
    else if (statusFilter === "INCOMPLETE") data = data.filter((r) => !r.clockOut && (r.status === "PRESENT" || r.status === "LATE"));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) =>
        `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(q) ||
        r.employee.employeeId.toLowerCase().includes(q)
      );
    }
    return data;
  }, [query.data, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pageRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedBranch = branchesQuery.data?.find((b) => b.id === branchId);

  function handleExport() {
    const headers = ["Employee ID", "Name", "Position", "Date", "Clock In", "Clock Out", "Status"];
    const rows = records.map((r) => [
      r.employee.employeeId,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.position ?? "",
      r.clockIn.slice(0, 10),
      formatClockTime(r.clockIn),
      r.clockOut ? formatClockTime(r.clockOut) : "",
      r.status,
    ]);
    const branch = selectedBranch ? `_${selectedBranch.name.replace(/\s+/g, "_")}` : "";
    exportToCsv(`attendance${branch}_${startDate}_to_${todayWorkDay}.csv`, headers, rows);
  }

  const summary = {
    present: records.filter(r => r.status === "PRESENT" && r.clockOut).length,
    late: records.filter(r => r.status === "LATE").length,
    absent: records.filter(r => r.status === "ABSENT").length,
    onLeave: records.filter(r => r.status === "HALF_DAY").length,
    ongoing: records.filter(r => (r.status === "PRESENT" || r.status === "LATE") && !r.clockOut).length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-400 mt-1">{dateLabel(todayWorkDay)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50"
            style={{ borderColor: BRAND, color: BRAND }}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="h-4 w-4" />
            Add Attendance
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present", value: summary.present + summary.ongoing, color: GREEN, stagger: 1 },
          { label: "Late", value: summary.late, color: AMBER, stagger: 2 },
          { label: "Absent", value: summary.absent, color: BRAND, stagger: 3 },
          { label: "On Leave", value: summary.onLeave, color: PURPLE, stagger: 4 },
        ].map((s) => (
          <div key={s.label} className={`animate-fade-up stagger-${s.stagger} relative overflow-hidden rounded-xl bg-white p-4 shadow-sm card-hover`} style={{ borderLeft: `4px solid ${s.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{s.label}</p>
            <p className="font-heading text-4xl leading-none" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters bar */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm items-center animate-fade-up stagger-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none"
          value={branchId}
          onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
        >
          <option value="">All Branches</option>
          {branchesQuery.data?.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none"
          value={dateRangeIdx}
          onChange={(e) => { setDateRangeIdx(Number(e.target.value)); setPage(1); }}
        >
          {DATE_RANGE_OPTIONS.map((o, i) => (
            <option key={o.label} value={i}>{o.label}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="COMPLETE">On Time</option>
          <option value="LATE">Late</option>
          <option value="INCOMPLETE">Ongoing</option>
          <option value="ABSENT">Absent</option>
        </select>
      </div>

      {/* Table */}
      <div className="animate-fade-up stagger-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead style={{ background: "#FDFAFA" }}>
            <tr style={{ borderBottom: "1px solid #F5EDED" }}>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Employee</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Role</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Date</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Time In</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Time Out</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Status</th>
              <th className="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#F5EDED" }}>
            {query.isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-red-500">
                  {extractErrorMessage(query.error, "Failed to load attendance")}
                </td>
              </tr>
            )}
            {!query.isLoading && records.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  No records match these filters.
                </td>
              </tr>
            )}
            {pageRecords.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF0F0]/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0" style={{ background: "#F3E4E4", color: BRAND }}>
                        {`${r.employee.firstName[0]}${r.employee.lastName[0]}`.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{r.employee.firstName} {r.employee.lastName}</p>
                        <p className="text-xs text-gray-400">{r.employee.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{r.employee.position ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-600">{formatDate(r.clockIn)}</td>
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

        {/* Pagination */}
        {!query.isLoading && records.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #F5EDED", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#aaa" }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, records.length)} of {records.length} records
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: p === page ? "none" : "1px solid #eee",
                    background: p === page ? BRAND : "#fff",
                    color: p === page ? "#fff" : "#666",
                    fontSize: 12, cursor: "pointer",
                    fontWeight: p === page ? 700 : 400,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AttendanceAdjustDialog
        open={!!adjustTarget}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
        record={adjustTarget}
      />

      <AttendanceAddDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
