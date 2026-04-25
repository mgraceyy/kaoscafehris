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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  formatShiftTime,
  updateShift,
  type Shift,
} from "./scheduling.api";

const editSchema = z.object({
  name: z.string().trim().min(1, "Required").max(60),
  date: z.string().min(1, "Required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM required"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM required"),
});

type EditValues = z.infer<typeof editSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
}

export default function ShiftFormDialog({ open, onOpenChange, shift }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      date: "",
      startTime: "08:00",
      endTime: "16:00",
    },
  });

  useEffect(() => {
    if (!open || !shift) return;
    reset({
      name: shift.name,
      date: shift.date.slice(0, 10),
      startTime: formatShiftTime(shift.startTime),
      endTime: formatShiftTime(shift.endTime),
    });
  }, [open, shift, reset]);

  const mutation = useMutation({
    mutationFn: async (values: EditValues) => {
      if (!shift) throw new Error("No shift to update");
      return updateShift(shift.id, {
        name: values.name,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast("Shift updated", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit shift</DialogTitle>
        <DialogDescription>
          Update shift details. Use the Assign button to change employee assignments.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Shift name</Label>
            <Input id="name" placeholder="Shift name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start time</Label>
            <Input id="startTime" type="time" {...register("startTime")} />
            {errors.startTime && (
              <p className="text-xs text-destructive">{errors.startTime.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End time</Label>
            <Input id="endTime" type="time" {...register("endTime")} />
            {errors.endTime && (
              <p className="text-xs text-destructive">{errors.endTime.message}</p>
            )}
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
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
