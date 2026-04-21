import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, Clock, Loader2 } from "lucide-react";
import { formatLocalTime, getMyAttendance, type PortalAttendance } from "./portal.api";

const BRAND = "#8C1515";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function firstOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function lastOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

const PERIODS = [
  { label: "This Month", get: () => { const d = new Date(); return { start: firstOfMonth(d), end: lastOfMonth(d) }; } },
  { label: "Last Month", get: () => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - 1); return { start: firstOfMonth(d), end: lastOfMonth(d) }; } },
  { label: "Last 7 Days", get: () => { const e = new Date(); const s = new Date(e); s.setUTCDate(s.getUTCDate() - 6); return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) }; } },
  { label: "Last 30 Days", get: () => { const e = new Date(); const s = new Date(e); s.setUTCDate(s.getUTCDate() - 29); return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) }; } },
];

function StatusBadge({ record }: { record: PortalAttendance }) {
  const hasClockOut = !!record.clockOut;

  if (record.status === "LATE") {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}>
        Late
      </span>
    );
  }
  if (record.status === "ABSENT") {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#FCE7F3", color: "#9D174D" }}>
        Leave
      </span>
    );
  }
  if (!hasClockOut && (record.status === "PRESENT")) {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
        Ongoing
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
      Complete
    </span>
  );
}

function fmtDate(dateIso: string) {
  const d = new Date(dateIso + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

function dayOf(dateIso: string) {
  return DAY_SHORT[new Date(dateIso + "T00:00:00").getDay()];
}

function AttendanceCard({ record }: { record: PortalAttendance }) {
  const dateStr = record.date.slice(0, 10);
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "#FAF0F0" }}>
            <CalendarDays className="h-5 w-5" style={{ color: BRAND }} />
          </div>
          <p className="font-semibold text-gray-800">{fmtDate(dateStr)}</p>
        </div>
        <StatusBadge record={record} />
      </div>

      <div className="flex items-start gap-2.5 mb-2">
        <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-gray-700">
            {formatLocalTime(record.clockIn)}
            {record.clockOut ? ` – ${formatLocalTime(record.clockOut)}` : ""}
          </p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs text-gray-400">{dayOf(dateStr)}</span>
            {record.clockOut && (
              <span className="text-xs text-gray-400">
                {dayOf(record.clockOut.slice(0, 10))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-600">{record.branch.name}</span>
      </div>
    </div>
  );
}

export default function PortalAttendancePage() {
  const [periodIdx, setPeriodIdx] = useState(0);

  const { start, end } = PERIODS[periodIdx].get();

  const query = useQuery({
    queryKey: ["portal-attendance", start, end],
    queryFn: () => getMyAttendance({ startDate: start, endDate: end }),
  });

  return (
    <div>
      {/* Header */}
      <div className="rounded-b-[28px] px-6 pt-14 pb-6" style={{ backgroundColor: BRAND }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Attendance History</h1>
          <img src="/kaos-logo.svg" alt="KAOS" className="h-10 w-auto brightness-0 invert opacity-60" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-6 space-y-4">
        {/* Period filter */}
        <div className="relative">
          <select
            value={periodIdx}
            onChange={(e) => setPeriodIdx(Number(e.target.value))}
            className="w-full appearance-none rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 shadow-sm pr-10"
          >
            {PERIODS.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* List */}
        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : query.data?.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No attendance records for this period.
          </div>
        ) : (
          <div className="space-y-3">
            {(query.data ?? []).map((r) => (
              <AttendanceCard key={r.id} record={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
