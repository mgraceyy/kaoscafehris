import { useEffect } from "react";
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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { createOvertimeRequest } from "./overtime.api";

const schema = z.object({
  date: z.string().min(1, "Required"),
  reason: z.string().trim().min(1, "Required").max(500),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OvertimeRequestDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { date: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ date: new Date().toISOString().slice(0, 10), reason: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (v: Values) => createOvertimeRequest({ date: v.date, reason: v.reason }),
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
