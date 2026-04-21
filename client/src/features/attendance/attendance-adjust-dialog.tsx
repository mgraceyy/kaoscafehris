import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
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
  return new Date(local).toISOString();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
}

export default function AttendanceAdjustDialog({ open, onOpenChange, record }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
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
    if (!open || !record) return;
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

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clockIn">Clock in</Label>
            <Input
              id="clockIn"
              type="datetime-local"
              {...register("clockIn")}
            />
            {errors.clockIn && (
              <p className="text-xs text-destructive">{errors.clockIn.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clockOut">Clock out</Label>
            <Input
              id="clockOut"
              type="datetime-local"
              {...register("clockOut")}
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
