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

/**
 * datetime-local inputs give "YYYY-MM-DDTHH:mm" without timezone. We treat that
 * as the user's local wall-clock and convert to an ISO string when submitting.
 */
const schema = z.object({
  clockIn: z.string().min(1, "Required"),
  clockOut: z.string().optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "HALF_DAY"]),
  remarks: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  // datetime-local value has no timezone — treat as Asia/Manila (UTC+8).
  return `${local}:00+08:00`;
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
      clockIn: "",
      clockOut: "",
      status: "PRESENT",
      remarks: "",
    },
  });

  useEffect(() => {
    if (!open) { setLightbox(null); return; }
    if (!record) return;
    reset({
      clockIn: toLocalInput(record.clockIn),
      clockOut: toLocalInput(record.clockOut),
      status: record.status,
      remarks: record.remarks ?? "",
    });
  }, [open, record, reset]);

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!record) throw new Error("Missing record");
      const payload: AdjustAttendanceInput = {
        clockIn: fromLocalInput(values.clockIn),
        clockOut: values.clockOut ? fromLocalInput(values.clockOut) : null,
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Clock in</Label>
            <Controller
              name="clockIn"
              control={control}
              render={({ field }) => {
                const [datePart, timePart] = (field.value ?? "").split("T");
                return (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      className="w-auto flex-1"
                      value={datePart ?? ""}
                      onChange={(e) => field.onChange(`${e.target.value}T${timePart ?? "08:00"}`)}
                    />
                    <TimePicker
                      className="flex-1"
                      value={timePart ?? "08:00"}
                      onChange={(t) => field.onChange(`${datePart ?? ""}T${t}`)}
                    />
                  </div>
                );
              }}
            />
            {errors.clockIn && (
              <p className="text-xs text-destructive">{errors.clockIn.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Clock out</Label>
            <Controller
              name="clockOut"
              control={control}
              render={({ field }) => {
                const [datePart, timePart] = (field.value ?? "").split("T");
                return (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      className="w-auto flex-1"
                      value={datePart ?? ""}
                      onChange={(e) => field.onChange(`${e.target.value}T${timePart ?? "08:00"}`)}
                    />
                    <TimePicker
                      className="flex-1"
                      value={timePart ?? ""}
                      onChange={(t) => field.onChange(`${datePart ?? ""}T${t}`)}
                    />
                  </div>
                );
              }}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if still clocked in.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...register("status")}>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="HALF_DAY">Half-day</option>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              rows={3}
              placeholder="Reason for manual adjustment…"
              {...register("remarks")}
            />
          </div>
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
