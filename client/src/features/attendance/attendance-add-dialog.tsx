import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listEmployees } from "@/features/employees/employees.api";
import { createAttendance } from "./attendance.api";

function todayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const mo = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${mo}-${d}`;
}

/** Combine a date string (YYYY-MM-DD) and time string (HH:mm) into an ISO datetime.
 *  Treat the admin-entered date+time as local wall-clock time (Asia/Manila = UTC+8).
 *  If clockOutTime < clockInTime, the clock-out is on the next calendar day.
 */
function toIso(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

function nextDayIso(date: string): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const schema = z.object({
  employeeId: z.string().uuid("Select an employee"),
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

  const employeesQuery = useQuery({
    queryKey: ["employees", { status: "ACTIVE" }],
    queryFn: () => listEmployees({ status: "ACTIVE" }),
    enabled: open,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: "",
      date: todayIso(),
      clockInTime: "08:00",
      clockOutTime: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        employeeId: "",
        date: todayIso(),
        clockInTime: "08:00",
        clockOutTime: "",
        remarks: "",
      });
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const clockOutDate =
        values.clockOutTime && values.clockOutTime < values.clockInTime
          ? nextDayIso(values.date)
          : values.date;
      return createAttendance({
        employeeId: values.employeeId,
        clockIn: toIso(values.date, values.clockInTime),
        clockOut: values.clockOutTime ? toIso(clockOutDate, values.clockOutTime) : null,
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
          <Label htmlFor="employeeId">Employee</Label>
          <Select id="employeeId" {...register("employeeId")}>
            <option value="">Select employee...</option>
            {employeesQuery.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.employeeId})
              </option>
            ))}
          </Select>
          {errors.employeeId && (
            <p className="text-xs text-destructive">{errors.employeeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" max={todayIso()} {...register("date")} />
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
