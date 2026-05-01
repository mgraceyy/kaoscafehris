import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShiftTime, type Shift } from "./scheduling.api";

interface Props {
  shifts: Shift[];
  weekDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: (date: string) => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onAssign: (shift: Shift) => void;
}

const TODAY = format(new Date(), "yyyy-MM-dd");

export default function SchedulingCalendar({
  shifts,
  weekDate,
  onPrev,
  onNext,
  onToday,
  onCreate,
  onEdit,
  onDelete,
  onAssign,
}: Props) {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel =
    format(days[0], "MMM d") + " – " + format(days[6], "MMM d, yyyy");

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-medium sm:flex-none sm:min-w-[200px] text-center">
          {weekLabel}
        </span>
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
      </div>

      {/* 7-day grid — horizontally scrollable on small screens */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[700px] grid grid-cols-7 divide-x">
          {/* Day column headers */}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = dateStr === TODAY;
            return (
              <div
                key={dateStr}
                className={cn(
                  "border-b px-2 py-2 text-center",
                  isToday && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "text-xs text-muted-foreground",
                    isToday && "text-primary"
                  )}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "text-base tabular-nums font-medium",
                    isToday && "text-primary font-semibold"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}

          {/* Day cells */}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter(
              (s) => s.date.slice(0, 10) === dateStr
            );
            const isToday = dateStr === TODAY;

            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[140px] p-1.5 space-y-1.5",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Add shift button */}
                <button
                  type="button"
                  onClick={() => onCreate(dateStr)}
                  className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>

                {/* Shift cards */}
                {dayShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssign={onAssign}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {shifts.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No shifts this week. Use the + buttons above to create shifts, or
          adjust the branch filter.
        </p>
      )}
    </div>
  );
}

function ShiftCard({
  shift,
  onEdit,
  onDelete,
  onAssign,
}: {
  shift: Shift;
  onEdit: (s: Shift) => void;
  onDelete: (s: Shift) => void;
  onAssign: (s: Shift) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(shift)}
      onKeyDown={(e) => e.key === "Enter" && onEdit(shift)}
      className="group cursor-pointer rounded border border-emerald-400/40 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-950/30 p-1.5 text-xs space-y-1 transition-colors hover:brightness-95"
    >
      {/* Name + status + action buttons */}
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium leading-tight line-clamp-2 flex-1">
          {shift.name}
        </span>
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Assign employees"
            onClick={() => onAssign(shift)}
            className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <UserPlus className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Delete shift"
            onClick={() => onDelete(shift)}
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Time */}
      <div className="tabular-nums text-muted-foreground">
        {formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}
      </div>

      {/* Branch + assignments + status badge */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="truncate text-muted-foreground max-w-[70%]">
          {shift.branch.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {shift.assignments.length > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Users className="h-3 w-3" />
              {shift.assignments.length}
            </span>
          )}
          <Badge variant="success" className="text-[10px] px-1.5 py-0">
            Active
          </Badge>
        </div>
      </div>
    </div>
  );
}
