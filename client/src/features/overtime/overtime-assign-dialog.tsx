import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listEmployees } from "@/features/employees/employees.api";
import {
  createOvertimeSchedule,
  updateOvertimeSchedule,
  type OvertimeSchedule,
} from "./overtime.api";

const schema = z.object({
  employeeId: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM format required"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM format required"),
  notes: z.string().trim().max(500).optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: OvertimeSchedule | null;
}

export default function OvertimeAssignDialog({ open, onOpenChange, editing }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const employeesQuery = useQuery({
    queryKey: ["employees", { status: "ACTIVE" }],
    queryFn: () => listEmployees({ status: "ACTIVE" }),
    enabled: open,
  });

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", date: "", startTime: "18:00", endTime: "22:00", notes: "" },
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          employeeId: editing.employeeId,
          date: editing.date.slice(0, 10),
          startTime: editing.startTime,
          endTime: editing.endTime,
          notes: editing.notes ?? "",
        });
      } else {
        reset({ employeeId: "", date: "", startTime: "18:00", endTime: "22:00", notes: "" });
      }
    }
  }, [open, editing, reset]);

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      editing
        ? updateOvertimeSchedule(editing.id, {
            date: v.date,
            startTime: v.startTime,
            endTime: v.endTime,
            notes: v.notes?.trim() || undefined,
          })
        : createOvertimeSchedule({
            employeeId: v.employeeId,
            date: v.date,
            startTime: v.startTime,
            endTime: v.endTime,
            notes: v.notes?.trim() || undefined,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime-schedules"] });
      toast(editing ? "Schedule updated" : "Overtime scheduled", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit Overtime Schedule" : "Assign Overtime"}</DialogTitle>
        <DialogDescription>
          Pre-assign an overtime shift for an employee.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        {!editing && (
          <div className="space-y-2">
            <Label htmlFor="ot-emp">Employee</Label>
            <Select id="ot-emp" {...register("employeeId")}>
              <option value="">Select employee…</option>
              {(employeesQuery.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeId})
                </option>
              ))}
            </Select>
            {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ot-date">Date</Label>
          <Input id="ot-date" type="date" {...register("date")} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ot-start">Start Time</Label>
            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <TimePicker id="ot-start" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ot-end">End Time</Label>
            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <TimePicker id="ot-end" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ot-notes">Notes (optional)</Label>
          <Textarea id="ot-notes" rows={2} placeholder="Reason or additional instructions…" {...register("notes")} />
          {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save Changes" : "Assign Overtime"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
