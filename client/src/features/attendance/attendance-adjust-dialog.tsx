import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  adjustAttendance,
  getAssignedShift,
  type AdjustAttendanceInput,
  type AttendanceRecord,
} from "./attendance.api";
import { COMPANY_TZ, isoToDateStr, isoToTimeStr, toIso, nextDayLocalIso } from "@/lib/timezone";

const schema = z.object({
  date: z.string().min(1, "Required"),
  clockInTime: z.string().min(1, "Required"),
  clockOutTime: z.string().optional(),
  status: z.enum(["AUTO", "ABSENT", "HALF_DAY"]),
  remarks: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

function fmtShiftTime(iso: string): string {
  // Shift times come as UTC Date objects serialized to ISO — only the time portion matters.
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
}

export default function AttendanceAdjustDialog({ open, onOpenChange, record }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      clockInTime: "",
      clockOutTime: "",
      status: "AUTO",
      remarks: "",
    },
  });

  const tz = COMPANY_TZ;

  useEffect(() => {
    if (!open) { setLightbox(null); return; }
    if (!record) return;
    reset({
      date: isoToDateStr(record.clockIn, tz),
      clockInTime: isoToTimeStr(record.clockIn, tz),
      clockOutTime: isoToTimeStr(record.clockOut, tz),
      status: (record.status === "ABSENT" || record.status === "HALF_DAY") ? record.status : "AUTO",
      remarks: record.remarks ?? "",
    });
  }, [open, record, reset, tz]);

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!record) throw new Error("Missing record");
      const clockOutDate =
        values.clockOutTime && values.clockOutTime < values.clockInTime
          ? nextDayLocalIso(values.date, tz)
          : values.date;
      const payload: AdjustAttendanceInput = {
        clockIn: toIso(values.date, values.clockInTime, tz),
        clockOut: values.clockOutTime ? toIso(clockOutDate, values.clockOutTime, tz) : null,
        status: values.status === "AUTO" ? undefined : values.status,
        remarks: values.remarks?.trim() ? values.remarks : null,
      };
      return adjustAttendance(record.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast("Attendance updated", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const shiftQuery = useQuery({
    queryKey: ["assigned-shift", record?.employeeId, record?.date.slice(0, 10)],
    queryFn: () => getAssignedShift(record!.employeeId, record!.date.slice(0, 10)),
    enabled: open && !!record,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Adjust attendance</DialogTitle>
        <DialogDescription>
          {record
            ? `${record.employee.firstName} ${record.employee.lastName} · ${record.date.slice(0, 10)}`
            : ""}
        </DialogDescription>
      </DialogHeader>

      {/* Selfie lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={lightbox} alt="Selfie" className="w-full rounded-2xl object-contain shadow-2xl max-h-[75vh]" />
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        {/* Selfie previews */}
        {(record?.selfieIn || record?.selfieOut) && (
          <div className="flex gap-4">
            {[
              { url: record?.selfieIn, label: "Clock In" },
              { url: record?.selfieOut, label: "Clock Out" },
            ].map(({ url, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                {url ? (
                  <button type="button" onClick={() => setLightbox(url)} className="focus:outline-none">
                    <img
                      src={url}
                      alt={label}
                      className="h-20 w-20 rounded-xl object-cover shadow ring-2 ring-gray-100 hover:ring-red-400 transition-all cursor-zoom-in"
                    />
                  </button>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
                    <Camera className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Clock In</Label>
            <Controller
              name="clockInTime"
              control={control}
              render={({ field }) => (
                <TimePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.clockInTime && (
              <p className="text-xs text-destructive">{errors.clockInTime.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Clock Out</Label>
            <Controller
              name="clockOutTime"
              control={control}
              render={({ field }) => (
                <TimePicker value={field.value} onChange={field.onChange} />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if still clocked in. If earlier than clock-in, treated as next day.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Assigned Shift</Label>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {shiftQuery.isLoading
              ? <span className="text-muted-foreground italic">Loading…</span>
              : shiftQuery.data
                ? <span>{shiftQuery.data.name} &middot; {fmtShiftTime(shiftQuery.data.startTime)} – {fmtShiftTime(shiftQuery.data.endTime)}</span>
                : <span className="text-muted-foreground italic">No shift assigned</span>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status Override</Label>
          <Select id="status" {...register("status")}>
            <option value="AUTO">Auto (Late / Present)</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half-day</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Auto computes Late or Present from clock-in vs shift start. Set manually only for Absent or Half-day.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Employee Clock-in Note</Label>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {record?.clockInNote || <span className="text-muted-foreground italic">No note provided</span>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Employee Clock-out Note</Label>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {record?.clockOutNote || <span className="text-muted-foreground italic">No note provided</span>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            rows={3}
            placeholder="Reason for manual adjustment…"
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
            Save
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
