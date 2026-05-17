import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import { listEmployees } from "@/features/employees/employees.api";
import {
  deleteShift,
  formatShiftTime,
  listShifts,
  unassignEmployee,
  type Shift,
} from "./scheduling.api";
import AssignShiftDialog from "./assign-shift-dialog";
import AssignEmployeesDialog from "./assign-employees-dialog";
import ShiftTypesDialog from "./shift-types-dialog";
import ShiftFormDialog from "./shift-form-dialog";
import { listShiftTypes } from "./shift-types.api";

const BRAND = "#8C1515";

const SHIFT_COLORS = [
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EDE9FE", text: "#5B21B6" },
];

function shiftColor(shiftId: string) {
  let hash = 0;
  for (const c of shiftId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
  return SHIFT_COLORS[Math.abs(hash) % SHIFT_COLORS.length];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [calendarWeek, setCalendarWeek] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [assignShiftDialogOpen, setAssignShiftDialogOpen] = useState(false);
  const [assignShiftInitialDate, setAssignShiftInitialDate] = useState<string | undefined>();
  const [dialogShift, setDialogShift] = useState<Shift | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignShift, setAssignShift] = useState<Shift | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Shift | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<
    { shift: Shift; employeeId: string; name: string } | null
  >(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => listEmployees({}),
  });

  // Auto-select when only one branch exists
  useEffect(() => {
    if (branchesQuery.data?.length === 1 && !branchId) {
      setBranchId(branchesQuery.data[0].id);
    }
  }, [branchesQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const calWeekStart = startOfWeek(calendarWeek, { weekStartsOn: 0 });
  const calMonthStart = startOfMonth(calendarMonth);
  const calMonthEnd = endOfMonth(calendarMonth);

  const filters = useMemo(() => {
    const isWeekly = view === "weekly";
    return {
      branchIds: branchId ? [branchId] : undefined,
      startDate: format(isWeekly ? calWeekStart : calMonthStart, "yyyy-MM-dd"),
      endDate: format(isWeekly ? addDays(calWeekStart, 6) : calMonthEnd, "yyyy-MM-dd"),
    };
  }, [branchId, view, calWeekStart, calMonthStart, calMonthEnd]);

  const query = useQuery({
    queryKey: ["shifts", view, branchId, filters.startDate, filters.endDate],
    queryFn: () => listShifts(filters),
  });

  const shiftTypesQuery = useQuery({
    queryKey: ["shift-types"],
    queryFn: () => listShiftTypes(),
  });

  const hasNoShiftTypes = !shiftTypesQuery.isLoading && (shiftTypesQuery.data?.length ?? 0) === 0;

  const remove = useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast("Shift deleted", "success");
      setConfirmDelete(null);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const unassign = useMutation({
    mutationFn: ({ shiftId, employeeId }: { shiftId: string; employeeId: string }) =>
      unassignEmployee(shiftId, employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast("Employee removed from shift", "success");
      setUnassignTarget(null);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  // Collect unique employees from the employees query
  const employees = useMemo(() => {
    return (employeesQuery.data ?? [])
      .filter((e) => e.employmentStatus !== "TERMINATED" && e.user.role !== "ADMIN")
      .map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
  }, [employeesQuery.data]);

  const filteredEmployees = useMemo(
    () => employeeId ? employees.filter((e) => e.id === employeeId) : employees,
    [employees, employeeId]
  );

  // Build day columns
  const weekDays = DAYS.map((label, i) => {
    const date = new Date(calWeekStart);
    date.setDate(date.getDate() + i);
    return { label, date, iso: format(date, "yyyy-MM-dd") };
  });

  // Shifts per employee per day
  function shiftsFor(employeeId: string, dayIso: string): Shift[] {
    return (query.data ?? []).filter(
      (s) =>
        s.date.slice(0, 10) === dayIso &&
        s.assignments.some((a) => a.employee.id === employeeId)
    );
  }

  // Shifts for a specific day, optionally filtered by selected employee
  function shiftsForDay(dayIso: string): Shift[] {
    return (query.data ?? []).filter((s) => {
      if (s.date.slice(0, 10) !== dayIso) return false;
      if (!employeeId) return true;
      return s.assignments.some((a) => a.employee.id === employeeId);
    });
  }

  // Unassigned shifts — hidden when employee filter is active (they have no assignees to match)
  const unassignedShifts = useMemo(() => {
    if (employeeId) return [];
    return (query.data ?? []).filter((s) => s.assignments.length === 0);
  }, [query.data, employeeId]);

  const rangeLabel = `${format(calWeekStart, "MMMM d")} - ${format(
    addDays(calWeekStart, 6), "MMMM d, yyyy"
  )}`;

  return (
    <div className="mx-auto max-w-full px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-heading text-3xl font-bold text-gray-900">Schedule</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTemplateDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Shift Types
            </button>
            <button
              onClick={() => { setAssignShiftInitialDate(undefined); setAssignShiftDialogOpen(true); }}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
              style={{ backgroundColor: BRAND }}
            >
              + Add Shift
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm items-center animate-fade-up">
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All Branches</option>
          {(branchesQuery.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
          ))}
        </select>
      </div>

      {/* Navigator */}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "weekly"
                  ? "bg-gray-100 text-gray-800"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "monthly"
                  ? "bg-gray-100 text-gray-800"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Monthly
            </button>
          </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => view === "weekly" ? setCalendarWeek((d) => subWeeks(d, 1)) : setCalendarMonth((d) => subMonths(d, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => {
                setPickerYear(view === "weekly" ? calendarWeek.getFullYear() : calendarMonth.getFullYear());
                setDatePickerOpen((o) => !o);
              }}
              className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors"
            >
              {view === "weekly" ? rangeLabel : format(calendarMonth, "MMMM yyyy")}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {datePickerOpen && (
              <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-lg p-4 w-72">
                {/* Year selector */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-gray-800">{pickerYear}</span>
                  <button
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1">
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, idx) => {
                    const target = new Date(pickerYear, idx, 1);
                    const isActive = view === "weekly"
                      ? calendarWeek.getMonth() === idx && calendarWeek.getFullYear() === pickerYear
                      : calendarMonth.getMonth() === idx && calendarMonth.getFullYear() === pickerYear;
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          if (view === "weekly") {
                            setCalendarWeek(target);
                          } else {
                            setCalendarMonth(target);
                          }
                          setDatePickerOpen(false);
                        }}
                        className={`rounded-lg py-1.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        style={isActive ? { backgroundColor: BRAND } : undefined}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => view === "weekly" ? setCalendarWeek((d) => addWeeks(d, 1)) : setCalendarMonth((d) => addMonths(d, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1" />
      </div>

      {/* No shift types warning */}
      {hasNoShiftTypes && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
          <span className="text-base leading-none">⚠</span>
          <div>
            <p className="font-semibold">No shift types found for this branch.</p>
            <p className="mt-0.5 text-yellow-700">
              Create a shift type first before adding shifts.{" "}
              <button
                className="font-semibold underline underline-offset-2 hover:text-yellow-900 transition-colors"
                onClick={() => setTemplateDialogOpen(true)}
              >
                Add Shift Type →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {query.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      )}

      {/* Weekly View */}
      {!query.isLoading && view === "weekly" && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-36 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Employee
                </th>
                {weekDays.map((d) => (
                  <th key={d.iso} className="px-3 py-3.5 text-center text-xs font-semibold text-gray-500">
                    <div>{d.label}</div>
                    <div className="font-normal text-gray-400">{format(d.date, "d MMM")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.length === 0 && unassignedShifts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    {employeeId
                      ? "No shifts found for the selected employee this week."
                      : "No shifts this week. Click \"+ Add Shift\" to create one."}
                  </td>
                </tr>
              )}
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {emp.firstName} {emp.lastName}
                  </td>
                  {weekDays.map((d) => {
                    const dayShifts = shiftsFor(emp.id, d.iso);
                    return (
                      <td key={d.iso} className="px-2 py-2 text-center align-top">
                        <div className="flex flex-col gap-1">
                          {dayShifts.map((s) => {
                            const col = shiftColor(s.id);
                            return (
                              <div
                                key={s.id}
                                className="group relative cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs"
                                style={{ backgroundColor: col.bg, color: col.text }}
                                onClick={() => { setDialogShift(s); setDialogOpen(true); }}
                              >
                                <div className="font-medium truncate">{s.name}</div>
                                <div>{formatShiftTime(s.startTime)} - {formatShiftTime(s.endTime)}</div>
                                <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                                  <button
                                    type="button"
                                    className="rounded p-0.5 hover:bg-black/10"
                                    onClick={(e) => { e.stopPropagation(); setAssignShift(s); }}
                                    title="Assign"
                                  >
                                    <UserPlus className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded p-0.5 hover:bg-black/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUnassignTarget({ shift: s, employeeId: emp.id, name: `${emp.firstName} ${emp.lastName}` });
                                    }}
                                    title="Unassign"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded p-0.5 hover:bg-black/10"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(s); }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Unassigned shifts row */}
              {unassignedShifts.length > 0 && (
                <tr className="bg-gray-50/50">
                  <td className="px-5 py-3 text-xs font-medium text-gray-400 italic">Unassigned</td>
                  {weekDays.map((d) => {
                    const dayShifts = unassignedShifts.filter((s) => s.date.slice(0, 10) === d.iso);
                    return (
                      <td key={d.iso} className="px-2 py-2 text-center align-top">
                        <div className="flex flex-col gap-1">
                          {dayShifts.map((s) => {
                            const col = shiftColor(s.id);
                            return (
                              <div
                                key={s.id}
                                className="group relative cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs"
                                style={{ backgroundColor: col.bg, color: col.text }}
                                onClick={() => { setDialogShift(s); setDialogOpen(true); }}
                              >
                                <div className="font-medium">{s.name}</div>
                                <div>{formatShiftTime(s.startTime)} - {formatShiftTime(s.endTime)}</div>
                                <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                                  <button type="button" className="rounded p-0.5 hover:bg-black/10" onClick={(e) => { e.stopPropagation(); setAssignShift(s); }}><UserPlus className="h-3 w-3" /></button>
                                  <button type="button" className="rounded p-0.5 hover:bg-black/10" onClick={(e) => { e.stopPropagation(); setConfirmDelete(s); }}><Trash2 className="h-3 w-3" /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly View */}
      {!query.isLoading && view === "monthly" && (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 gap-0">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0">
            {eachDayOfInterval({
              start: startOfWeek(calMonthStart, { weekStartsOn: 0 }),
              end: endOfWeek(calMonthEnd, { weekStartsOn: 0 }),
            }).map((day) => {
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const dayIso = format(day, "yyyy-MM-dd");
              const dayShifts = shiftsForDay(dayIso);
              const dayNum = format(day, "d");

              return (
                <div
                  key={dayIso}
                  className={`min-h-28 border border-gray-200 p-2 text-xs ${
                    !isCurrentMonth ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`font-semibold ${isCurrentMonth ? "text-gray-800" : "text-gray-400"}`}>
                      {dayNum}
                    </span>
                    <button
                      onClick={() => { setAssignShiftInitialDate(dayIso); setAssignShiftDialogOpen(true); }}
                      className="rounded px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-xs"
                      title="Add shift"
                    >
                      +
                    </button>
                  </div>
                  <div className="space-y-1">
                    {dayShifts.map((s) => {
                      const col = shiftColor(s.id);
                      return (
                        <div
                          key={s.id}
                          className="group relative cursor-pointer rounded px-1.5 py-1 text-xs"
                          style={{ backgroundColor: col.bg, color: col.text }}
                          onClick={() => { setDialogShift(s); setDialogOpen(true); }}
                          title={s.name}
                        >
                          <div className="truncate font-medium">{s.name}</div>
                          <div className="truncate text-xs opacity-80">
                            {formatShiftTime(s.startTime)} - {formatShiftTime(s.endTime)}
                          </div>
                          {s.assignments.length > 0 && (
                            <div className="mt-0.5 space-y-0.5">
                              {[...s.assignments].sort((a, b) => `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(`${b.employee.firstName} ${b.employee.lastName}`)).map((a) => (
                                <div key={a.id} className="truncate text-xs opacity-70">
                                  {a.employee.firstName} {a.employee.lastName}
                                  {a.assignedBranch && (
                                    <div className="truncate opacity-75" style={{ fontSize: "0.65rem" }}>
                                      {a.assignedBranch.name}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="absolute right-0.5 top-0.5 hidden gap-0.5 group-hover:flex">
                            <button
                              type="button"
                              className="rounded p-0.5 hover:bg-black/10"
                              onClick={(e) => { e.stopPropagation(); setAssignShift(s); }}
                              title="Assign"
                            >
                              <UserPlus className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-0.5 hover:bg-black/10"
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(s); }}
                              title="Delete"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AssignShiftDialog open={assignShiftDialogOpen} onOpenChange={setAssignShiftDialogOpen} initialDate={assignShiftInitialDate} />
      <ShiftFormDialog open={dialogOpen} onOpenChange={setDialogOpen} shift={dialogShift} />
      <AssignEmployeesDialog open={!!assignShift} onOpenChange={(o) => !o && setAssignShift(null)} shift={assignShift} />
      <ShiftTypesDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete shift?"
        description={confirmDelete ? `"${confirmDelete.name}" on ${confirmDelete.date.slice(0, 10)} will be removed.` : ""}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      />
      <ConfirmDialog
        open={!!unassignTarget}
        onOpenChange={(o) => !o && setUnassignTarget(null)}
        title="Remove from shift?"
        description={unassignTarget ? `${unassignTarget.name} will be unassigned from "${unassignTarget.shift.name}".` : ""}
        confirmLabel="Remove"
        destructive
        loading={unassign.isPending}
        onConfirm={() => unassignTarget && unassign.mutate({ shiftId: unassignTarget.shift.id, employeeId: unassignTarget.employeeId })}
      />
    </div>
  );
}
