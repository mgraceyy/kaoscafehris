import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, X } from "lucide-react";
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
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listEmployees } from "@/features/employees/employees.api";
import { listShiftTypes } from "@/features/scheduling/shift-types.api";
import { createAttendance, getAssignedShift } from "./attendance.api";
import { COMPANY_TZ, todayIsoLocal, toIso, nextDayLocalIso } from "@/lib/timezone";

function formatShiftTime(isoTime: string): string {
  const d = new Date(isoTime);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const schema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  shiftTypeId: z.string().uuid("Select a shift"),
  date: z.string().min(1, "Required"),
  clockInTime: z.string().min(1, "Required"),
  clockOutTime: z.string().optional(),
  remarks: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AttendanceAddDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [empSearch, setEmpSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => listEmployees({}),
    enabled: open,
    select: (data) => data.filter((e) => e.employmentStatus !== "TERMINATED"),
  });

  const shiftTypesQuery = useQuery({
    queryKey: ["shiftTypes"],
    queryFn: () => listShiftTypes(),
    enabled: open,
  });

  const tz = COMPANY_TZ;

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: "",
      shiftTypeId: "",
      date: todayIsoLocal(tz),
      clockInTime: "08:00",
      clockOutTime: "",
      remarks: "",
    },
  });

  const selectedShiftTypeId = watch("shiftTypeId");
  const selectedShiftType = shiftTypesQuery.data?.find((s) => s.id === selectedShiftTypeId);
  const watchedEmployeeId = watch("employeeId");
  const watchedDate = watch("date");

  const assignedShiftQuery = useQuery({
    queryKey: ["assigned-shift", watchedEmployeeId, watchedDate],
    queryFn: () => getAssignedShift(watchedEmployeeId, watchedDate),
    enabled: !!watchedEmployeeId && !!watchedDate,
  });

  useEffect(() => {
    if (open) {
      reset({
        employeeId: "",
        shiftTypeId: "",
        date: todayIsoLocal(tz),
        clockInTime: "08:00",
        clockOutTime: "",
        remarks: "",
      });
      setEmpSearch("");
      setDropdownOpen(false);
    }
  }, [open, reset, tz]);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredEmployees = (employeesQuery.data ?? []).filter((e) => {
    const q = empSearch.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q)
    );
  });

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const clockOutDate =
        values.clockOutTime && values.clockOutTime < values.clockInTime
          ? nextDayLocalIso(values.date, tz)
          : values.date;
      return createAttendance({
        employeeId: values.employeeId,
        shiftTypeId: values.shiftTypeId,
        clockIn: toIso(values.date, values.clockInTime, tz),
        clockOut: values.clockOutTime ? toIso(clockOutDate, values.clockOutTime, tz) : null,
        remarks: values.remarks?.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast("Attendance record added", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Add Attendance</DialogTitle>
        <DialogDescription>
          Manually add an attendance record for an employee who forgot to clock in.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="space-y-2">
          <Label>Employee</Label>
          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => {
              const selected = employeesQuery.data?.find((e) => e.id === field.value);
              return (
                <div ref={comboboxRef} className="relative">
                  <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
                    <input
                      className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Search employee..."
                      value={dropdownOpen ? empSearch : (selected ? `${selected.firstName} ${selected.lastName} (${selected.employeeId})` : "")}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setDropdownOpen(true);
                        if (!e.target.value) field.onChange("");
                      }}
                      onFocus={() => {
                        setEmpSearch("");
                        setDropdownOpen(true);
                      }}
                    />
                    {field.value ? (
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        onClick={() => { field.onChange(""); setEmpSearch(""); setDropdownOpen(false); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>

                  {dropdownOpen && (
                    <div className="absolute z-[200] mt-1 max-h-52 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {filteredEmployees.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">No employees found.</p>
                      ) : (
                        filteredEmployees.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => {
                              field.onChange(e.id);
                              setEmpSearch("");
                              setDropdownOpen(false);
                            }}
                          >
                            {e.firstName} {e.lastName}
                            <span className="ml-1.5 text-xs text-gray-400">({e.employeeId})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          />
          {errors.employeeId && (
            <p className="text-xs text-destructive">{errors.employeeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shiftTypeId">Shift</Label>
          <Controller
            name="shiftTypeId"
            control={control}
            render={({ field }) => (
              <select
                id="shiftTypeId"
                value={field.value}
                onChange={field.onChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a shift...</option>
                {(shiftTypesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatShiftTime(s.startTime)} – {formatShiftTime(s.endTime)})
                  </option>
                ))}
              </select>
            )}
          />
          {errors.shiftTypeId && (
            <p className="text-xs text-destructive">{errors.shiftTypeId.message}</p>
          )}
          {selectedShiftType && (
            <p className="text-xs text-muted-foreground">
              Scheduled: {formatShiftTime(selectedShiftType.startTime)} – {formatShiftTime(selectedShiftType.endTime)}. Late/overtime will be calculated against these times.
            </p>
          )}
          {assignedShiftQuery.data && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
              Currently assigned: <strong>{assignedShiftQuery.data.name}</strong> ({formatShiftTime(assignedShiftQuery.data.startTime)} – {formatShiftTime(assignedShiftQuery.data.endTime)}). Your selection above will override this.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" max={todayIsoLocal(tz)} {...register("date")} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clockInTime">Clock In</Label>
            <Controller
              name="clockInTime"
              control={control}
              render={({ field }) => (
                <TimePicker id="clockInTime" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.clockInTime && (
              <p className="text-xs text-destructive">{errors.clockInTime.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clockOutTime">Clock Out</Label>
            <Controller
              name="clockOutTime"
              control={control}
              render={({ field }) => (
                <TimePicker id="clockOutTime" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.clockOutTime && (
              <p className="text-xs text-destructive">{errors.clockOutTime.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Leave blank if not yet clocked out. If earlier than clock-in, it is treated as the next day.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            rows={2}
            placeholder="e.g. Forgot to clock in"
            {...register("remarks")}
          />
        </div>

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
            Add Record
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
