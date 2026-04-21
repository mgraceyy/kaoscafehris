import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { formatTime, getMySchedule, type PortalShift } from "./portal.api";

const BRAND = "#8C1515";
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="rounded-b-[28px] px-6 pt-14 pb-6" style={{ backgroundColor: BRAND }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <img src="/kaos-logo.svg" alt="KAOS" className="h-10 w-auto brightness-0 invert opacity-60" />
      </div>
    </div>
  );
}

function ShiftCard({ shift, isToday }: { shift: PortalShift; isToday: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-800">
          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
        </p>
        {isToday && (
          <p className="text-xs text-gray-400">
            {DAY_SHORT[new Date(shift.date + "T00:00:00").getDay()]}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Weekly View ────────────────────────────────────────────────────────────

function WeeklyView({
  anchor,
  onPrev,
  onNext,
  monthLabel,
}: {
  anchor: Date;
  onPrev: () => void;
  onNext: () => void;
  monthLabel: string;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor]
  );
  const rangeStart = ymd(anchor);
  const rangeEnd = ymd(addDays(anchor, 6));

  const query = useQuery({
    queryKey: ["portal-schedule", rangeStart, rangeEnd],
    queryFn: () => getMySchedule({ startDate: rangeStart, endDate: rangeEnd }),
  });

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, PortalShift[]>();
    for (const s of query.data ?? []) {
      const key = s.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [query.data]);

  const todayKey = ymd(new Date());

  return (
    <>
      {/* Month navigator */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <button
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-base font-semibold text-gray-800">{monthLabel}</span>
        <button
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="px-4 pb-6 space-y-3">
          {days.map((d) => {
            const key = ymd(d);
            const shifts = shiftsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            const dow = d.getUTCDay();

            return (
              <div
                key={key}
                className={`bg-white rounded-2xl p-4 border shadow-sm ${
                  isToday ? "border-[#8C1515]/30" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400">
                      {DAY_SHORT[dow]}, {MONTH_NAMES[d.getUTCMonth()].slice(0, 3)} {d.getUTCDate()}
                    </p>
                    <p className="font-bold text-gray-800 text-base">{DAY_LONG[dow].slice(0, 3)}</p>
                  </div>
                  {isToday && (
                    <span
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
                    >
                      Today
                    </span>
                  )}
                </div>

                {shifts.length === 0 ? (
                  <p className="text-sm text-gray-400">Day Off</p>
                ) : (
                  <div className="space-y-2.5">
                    {shifts.map((s) => (
                      <div key={s.assignmentId}>
                        <ShiftCard shift={s} isToday={false} />
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-600">{s.branch.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Monthly View ───────────────────────────────────────────────────────────

const CELL_COLORS = [
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#EDE9FE", text: "#6D28D9" },
];

function branchColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return CELL_COLORS[Math.abs(h) % CELL_COLORS.length];
}

function MonthlyView({
  year,
  month,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const startDate = ymd(startOfMonth(year, month));
  const endDate = ymd(new Date(Date.UTC(year, month + 1, 0)));

  const query = useQuery({
    queryKey: ["portal-schedule", startDate, endDate],
    queryFn: () => getMySchedule({ startDate, endDate }),
  });

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, PortalShift[]>();
    for (const s of query.data ?? []) {
      const key = s.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [query.data]);

  // Build calendar grid (Sun-Sat, 6 rows max)
  const firstDay = startOfMonth(year, month);
  const startOffset = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayKey = ymd(new Date());

  const cells: Array<number | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-base font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 pb-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_SHORT.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {query.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} className="bg-white min-h-[56px]" />;
              }
              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const shifts = shiftsByDay.get(dateKey) ?? [];
              const isToday = dateKey === todayKey;

              return (
                <div key={dateKey} className="bg-white min-h-[56px] p-1">
                  <div className="flex justify-center mb-1">
                    <span
                      className={`text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? "text-white font-bold"
                          : "text-gray-700"
                      }`}
                      style={isToday ? { backgroundColor: BRAND } : {}}
                    >
                      {day}
                    </span>
                  </div>
                  {shifts.slice(0, 1).map((s) => {
                    const col = branchColor(s.branch.name);
                    return (
                      <div
                        key={s.assignmentId}
                        className="rounded px-1 py-0.5 text-[9px] leading-tight"
                        style={{ backgroundColor: col.bg, color: col.text }}
                      >
                        <p className="font-medium truncate">
                          {formatTime(s.startTime)}–
                        </p>
                        <p className="font-medium truncate">
                          {formatTime(s.endTime)}
                        </p>
                        <p className="truncate opacity-80">{s.branch.name.split(" ")[0]}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PortalSchedulePage() {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");

  const now = new Date();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(now));
  const [calYear, setCalYear] = useState(now.getUTCFullYear());
  const [calMonth, setCalMonth] = useState(now.getUTCMonth());

  const weekMonthLabel = useMemo(() => {
    const mid = addDays(weekAnchor, 3);
    return `${MONTH_NAMES[mid.getUTCMonth()]} ${mid.getUTCFullYear()}`;
  }, [weekAnchor]);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  return (
    <div>
      <PageHeader title="My Schedule" />

      {/* Toggle */}
      <div className="px-4 pt-5">
        <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
          {(["weekly", "monthly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
              }`}
              style={view === v ? { color: BRAND } : {}}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === "weekly" ? (
        <WeeklyView
          anchor={weekAnchor}
          monthLabel={weekMonthLabel}
          onPrev={() => setWeekAnchor((a) => addDays(a, -7))}
          onNext={() => setWeekAnchor((a) => addDays(a, 7))}
        />
      ) : (
        <MonthlyView
          year={calYear}
          month={calMonth}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
      )}
    </div>
  );
}
