import { useMemo, useState } from "react";
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Trash2, UserPlus, X, Settings } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
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
import GenerateShiftsDialog from "./generate-shifts-dialog";
import EmployeeDefaultShiftsDialog from "./employee-default-shifts-dialog";

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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SchedulingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [calendarWeek, setCalendarWeek] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string>("");
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
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [employeeDefaultShiftsDialogOpen, setEmployeeDefaultShiftsDialogOpen] = useState(false);

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
  });

  const calWeekStart = startOfWeek(calendarWeek, { weekStartsOn: 1 });
  const calMonthStart = startOfMonth(calendarMonth);
  const calMonthEnd = endOfMonth(calendarMonth);

  const filters = useMemo(() => {
    const isWeekly = view === "weekly";
    return {
      branchId: branchId || undefined,
      startDate: format(isWeekly ? calWeekStart : calMonthStart, "yyyy-MM-dd"),
      endDate: format(isWeekly ? addWeeks(calWeekStart, 1) : calMonthEnd, "yyyy-MM-dd"),
    };
  }, [branchId, view, calWeekStart, calMonthStart, calMonthEnd]);

  const query = useQuery({
    queryKey: ["shifts", filters],
    queryFn: () => listShifts(filters),
  });

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

  // Collect unique employees across all shifts
  const employees = useMemo(() => {
    const map = new Map<string, { id: string; firstName: string; lastName: string }>();
    for (const shift of query.data ?? []) {
      for (const a of shift.assignments) {
        if (!map.has(a.employee.id)) map.set(a.employee.id, a.employee);
      }
    }
    return Array.from(map.values());
  }, [query.data]);

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

  // Shifts for a specific day (all, including unassigned)
  function shiftsForDay(dayIso: string): Shift[] {
    return (query.data ?? []).filter((s) => s.date.slice(0, 10) === dayIso);
  }

  // Also collect shifts not assigned to any tracked employee (unassigned shifts)
  const unassignedShifts = useMemo(() => {
    return (query.data ?? []).filter((s) => s.assignments.length === 0);
  }, [query.data]);

  const rangeLabel = `${format(calWeekStart, "MMMM d")} - ${format(
    addWeeks(calWeekStart, 1), "MMMM d, yyyy"
  )}`;

  return (
    <div className="mx-auto max-w-full px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Schedule</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                view === "weekly"
                  ? "bg-gray-100 text-gray-800"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                view === "monthly"
                  ? "bg-gray-100 text-gray-800"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Monthly
            </button>
          </div>
          {branchesQuery.data && branchesQuery.data.length > 1 && (
            <select
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All Branches</option>
              {branchesQuery.data.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => { setAssignShiftInitialDate(undefined); setAssignShiftDialogOpen(true); }}
            className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm"
            style={{ backgroundColor: BRAND }}
          >
            + Add Shift
          </button>
          <button
            onClick={() => setTemplateDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            title="Manage shift templates"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setGenerateDialogOpen(true)}
            disabled={!branchId}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate shifts from employee defaults"
          >
            Generate Shifts
          </button>
          <button
            onClick={() => setEmployeeDefaultShiftsDialogOpen(true)}
            disabled={!branchId}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Set employee default shifts"
          >
            Employee Defaults
          </button>
        </div>
      </div>

      {/* Navigator */}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
        <button
          onClick={() => view === "weekly" ? setCalendarWeek((d) => subWeeks(d, 1)) : setCalendarMonth((d) => subMonths(d, 1))}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {view === "weekly" ? rangeLabel : format(calendarMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => view === "weekly" ? setCalendarWeek((d) => addWeeks(d, 1)) : setCalendarMonth((d) => addMonths(d, 1))}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

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
              {employees.length === 0 && unassignedShifts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    No shifts this week. Click "+ Add Shift" to create one.
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
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
                                <div className="font-medium truncate">{emp.firstName} {emp.lastName}</div>
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
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label} className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0">
            {eachDayOfInterval({ start: calMonthStart, end: calMonthEnd }).map((day) => {
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
      <ShiftTypesDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} branchId={branchId} />
      <GenerateShiftsDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen} branchId={branchId} />
      <EmployeeDefaultShiftsDialog open={employeeDefaultShiftsDialogOpen} onOpenChange={setEmployeeDefaultShiftsDialogOpen} branchId={branchId} />

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
