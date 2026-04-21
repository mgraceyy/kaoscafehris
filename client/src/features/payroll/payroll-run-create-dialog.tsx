import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import { createRun } from "./payroll.api";

const schema = z
  .object({
    branchId: z.string().uuid("Select a branch"),
    periodStart: z.string().min(1, "Required"),
    periodEnd: z.string().min(1, "Required"),
  })
  .refine((v) => new Date(v.periodStart) <= new Date(v.periodEnd), {
    message: "Period end must be on or after period start",
    path: ["periodEnd"],
  });

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultPeriod() {
  const now = new Date();
  const day = now.getUTCDate();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // First half if today <= 15, else second half.
  if (day <= 15) {
    return {
      periodStart: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
      periodEnd: new Date(Date.UTC(y, m, 15)).toISOString().slice(0, 10),
    };
  }
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return {
    periodStart: new Date(Date.UTC(y, m, 16)).toISOString().slice(0, 10),
    periodEnd: new Date(Date.UTC(y, m, lastDay)).toISOString().slice(0, 10),
  };
}

export default function PayrollRunCreateDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const branchesQuery = useQuery({
    queryKey: ["branches", { isActive: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: open,
  });

  const defaults = useMemo<Values>(() => {
    const p = defaultPeriod();
    return { branchId: "", periodStart: p.periodStart, periodEnd: p.periodEnd };
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, reset, defaults]);

  const mutation = useMutation({
    mutationFn: (values: Values) => createRun(values),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast("Payroll run created", "success");
      onOpenChange(false);
      navigate(`/payroll/${run.id}`);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Create payroll run</DialogTitle>
        <DialogDescription>
          Opens a bi-monthly payroll for a branch. You can process it after
          creation to generate payslips for all active employees.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="branchId">Branch</Label>
          <Select id="branchId" {...register("branchId")}>
            <option value="">Select branch…</option>
            {branchesQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          {errors.branchId && (
            <p className="text-xs text-destructive">{errors.branchId.message}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="periodStart">Period start</Label>
            <Input
              id="periodStart"
              type="date"
              {...register("periodStart")}
            />
            {errors.periodStart && (
              <p className="text-xs text-destructive">
                {errors.periodStart.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodEnd">Period end</Label>
            <Input id="periodEnd" type="date" {...register("periodEnd")} />
            {errors.periodEnd && (
              <p className="text-xs text-destructive">
                {errors.periodEnd.message}
              </p>
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
            Create
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
