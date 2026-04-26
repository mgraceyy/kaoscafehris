import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listEmployees } from "@/features/employees/employees.api";
import { useAuthStore } from "@/features/auth/auth.store";
import { createRequest } from "./leave.api";

const schema = z
  .object({
    employeeId: z.string().uuid("Select an employee"),
    leaveType: z.enum([
      "VACATION",
      "SICK",
      "EMERGENCY",
      "MATERNITY",
      "PATERNITY",
      "UNPAID",
    ]),
    startDate: z.string().min(1, "Required"),
    endDate: z.string().min(1, "Required"),
    totalDays: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
      .pipe(z.number().positive("Must be greater than zero").max(365)),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function inclusiveDayCount(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 86_400_000) + 1;
}

export default function LeaveRequestDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isEmployee = user?.role === "EMPLOYEE";

  const employeesQuery = useQuery({
    queryKey: ["employees", { status: "ACTIVE" }],
    queryFn: () => listEmployees({ status: "ACTIVE" }),
    enabled: open && !isEmployee,
    select: (data) => data.filter((e) => e.position !== "Administrator"),
  });

  const defaults = useMemo<Values>(
    () => ({
      employeeId: isEmployee ? (user?.employee?.id ?? "") : "",
      leaveType: "VACATION",
      startDate: "",
      endDate: "",
      totalDays: 1,
      reason: "",
    }),
    [isEmployee, user]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, reset, defaults]);

  useEffect(() => {
    const days = inclusiveDayCount(startDate, endDate);
    if (days > 0) setValue("totalDays", days, { shouldDirty: true });
  }, [startDate, endDate, setValue]);

  const mutation = useMutation({
    mutationFn: async (values: Values) =>
      createRequest({
        employeeId: values.employeeId,
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        totalDays: values.totalDays,
        reason: values.reason?.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast("Leave request submitted", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>File leave request</DialogTitle>
        <DialogDescription>
          {isEmployee
            ? "Submit a leave request. Pending requests await approval from your manager."
            : "Submit on behalf of an employee. Pending requests await approval."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-h-[70vh] space-y-4 overflow-y-auto pt-4 pr-1"
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {!isEmployee && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="employeeId">Employee</Label>
              <Select id="employeeId" {...register("employeeId")}>
                <option value="">Select employee…</option>
                {employeesQuery.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} · {e.employeeId}
                  </option>
                ))}
              </Select>
              {errors.employeeId && (
                <p className="text-xs text-destructive">{errors.employeeId.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave type</Label>
            <Select id="leaveType" {...register("leaveType")}>
              <option value="VACATION">Vacation</option>
              <option value="SICK">Sick</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="MATERNITY">Maternity</option>
              <option value="PATERNITY">Paternity</option>
              <option value="UNPAID">Unpaid</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalDays">Total days</Label>
            <Input
              id="totalDays"
              type="number"
              step="0.5"
              min="0.5"
              {...register("totalDays")}
            />
            {errors.totalDays && (
              <p className="text-xs text-destructive">{errors.totalDays.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
            {errors.endDate && (
              <p className="text-xs text-destructive">{errors.endDate.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea id="reason" rows={3} {...register("reason")} />
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
            Submit
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
