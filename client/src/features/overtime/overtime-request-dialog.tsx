import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { createOvertimeRequest } from "./overtime.api";
import { COMPANY_TZ, todayIsoLocal } from "@/lib/timezone";

function computeOtHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

const schema = z.object({
  date: z.string().min(1, "Required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM").optional().or(z.literal("")),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM").optional().or(z.literal("")),
  otHours: z.number().positive("Must be > 0").max(24, "Max 24h").optional(),
  reason: z.string().trim().min(1, "Required").max(500),
});

interface FormValues {
  date: string;
  startTime?: string;
  endTime?: string;
  otHours?: number;
  reason: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OvertimeRequestDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const manuallySetHours = useRef(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: "", startTime: "", endTime: "", otHours: undefined, reason: "" },
  });

  const watchStart = watch("startTime");
  const watchEnd = watch("endTime");

  useEffect(() => {
    if (open) {
      reset({ date: todayIsoLocal(COMPANY_TZ), startTime: "", endTime: "", otHours: undefined, reason: "" });
      manuallySetHours.current = false;
    }
  }, [open, reset]);

  useEffect(() => {
    if (manuallySetHours.current) return;
    if (watchStart && watchEnd && /^\d{2}:\d{2}$/.test(watchStart) && /^\d{2}:\d{2}$/.test(watchEnd)) {
      setValue("otHours", computeOtHours(watchStart, watchEnd));
    }
  }, [watchStart, watchEnd, setValue]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => createOvertimeRequest({
      date: v.date,
      startTime: v.startTime || undefined,
      endTime: v.endTime || undefined,
      reason: v.reason,
      otHours: v.otHours,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime"] });
      toast("Overtime request submitted", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Request Overtime</DialogTitle>
        <DialogDescription>
          Submit a request to work past your shift end. Your manager or admin must approve it before the shift ends.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="ot-date">Date</Label>
          <Input id="ot-date" type="date" {...register("date")} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <TimePicker
              value={watchStart ?? ""}
              onChange={(v) => setValue("startTime", v, { shouldValidate: false })}
            />
            {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <TimePicker
              value={watchEnd ?? ""}
              onChange={(v) => setValue("endTime", v, { shouldValidate: false })}
            />
            {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ot-hours">OT Hours</Label>
          <Input
            id="ot-hours"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            placeholder="e.g. 2"
            {...register("otHours", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })}
            onChange={(e) => {
              manuallySetHours.current = true;
              const v = e.target.value;
              setValue("otHours", v === "" ? undefined : Number(v), { shouldValidate: true });
            }}
          />
          {errors.otHours && <p className="text-xs text-destructive">{errors.otHours.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ot-reason">Reason</Label>
          <Textarea id="ot-reason" rows={3} placeholder="Describe why overtime is needed…" {...register("reason")} />
          {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
