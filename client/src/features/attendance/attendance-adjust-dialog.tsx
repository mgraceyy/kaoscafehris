import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  type AdjustAttendanceInput,
  type AttendanceRecord,
} from "./attendance.api";

const schema = z.object({
  date: z.string().min(1, "Required"),
  clockInTime: z.string().min(1, "Required"),
  clockOutTime: z.string().optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "HALF_DAY"]),
  remarks: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

function toIso(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

function nextDayIso(date: string): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TZ = "Asia/Manila";

/** Extract YYYY-MM-DD in the company timezone so the date field pre-fills correctly. */
function isoToDateStr(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "2000";
  const mo = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${mo}-${d}`;
}

/** Extract HH:mm in the company timezone so it matches the +08:00 offset used by toIso(). */
function isoToTimeStr(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
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
      status: "PRESENT",
      remarks: "",
    },
  });

  useEffect(() => {
    if (!open) { setLightbox(null); return; }
    if (!record) return;
    reset({
      date: isoToDateStr(record.clockIn),
      clockInTime: isoToTimeStr(record.clockIn),
      clockOutTime: isoToTimeStr(record.clockOut),
      status: record.status,
      remarks: record.remarks ?? "",
    });
  }, [open, record, reset]);

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!record) throw new Error("Missing record");
      const clockOutDate =
        values.clockOutTime && values.clockOutTime < values.clockInTime
          ? nextDayIso(values.date)
          : values.date;
      const payload: AdjustAttendanceInput = {
        clockIn: toIso(values.date, values.clockInTime),
        clockOut: values.clockOutTime ? toIso(clockOutDate, values.clockOutTime) : null,
        status: values.status,
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
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half-day</option>
          </Select>
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
