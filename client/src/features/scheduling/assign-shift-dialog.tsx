import { useEffect, useMemo, useState } from "react";
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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import { listEmployees } from "@/features/employees/employees.api";
import { createShift } from "./scheduling.api";
import { listShiftTypes } from "./shift-types.api";

const schema = z.object({
  branchId: z.string().uuid("Select a branch"),
  shiftTypeId: z.string().uuid("Select a shift template"),
  date: z.string().min(1, "Pick a date"),
  employeeIds: z.array(z.string().uuid()).min(1, "Select at least one employee"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
}

export default function AssignShiftDialog({ open, onOpenChange, initialDate }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: "",
      shiftTypeId: "",
      date: initialDate ?? "",
      employeeIds: [],
    },
  });

  const selectedBranch = watch("branchId");
  const selectedEmployees = watch("employeeIds") ?? [];

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: open,
  });

  const shiftTypesQuery = useQuery({
    queryKey: ["shift-types", selectedBranch],
    queryFn: () => listShiftTypes(selectedBranch),
    enabled: open && !!selectedBranch,
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", { branchId: selectedBranch }],
    queryFn: () =>
      listEmployees({ branchId: selectedBranch, status: "ACTIVE" }),
    enabled: open && !!selectedBranch,
  });

  useEffect(() => {
    if (open) {
      reset({
        branchId: "",
        shiftTypeId: "",
        date: initialDate ?? "",
        employeeIds: [],
      });
    }
  }, [open, reset, initialDate]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Get the shift template to get the shift name
      const shiftType = shiftTypesQuery.data?.find((t) => t.id === values.shiftTypeId);
      if (!shiftType) throw new Error("Shift template not found");

      return createShift({
        branchId: values.branchId,
        shiftTypeId: values.shiftTypeId,
        name: shiftType.name,
        date: values.date,
        employeeIds: values.employeeIds,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast("Shift assigned to employees", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function toggleEmployee(id: string, checked: boolean) {
    const current = selectedEmployees ?? [];
    const next = checked
      ? [...current, id]
      : current.filter((x) => x !== id);
    setValue("employeeIds", next, { shouldDirty: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Assign Shift</DialogTitle>
        <DialogDescription>
          Select a shift template, date, and employees to assign to that shift.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-h-[70vh] space-y-4 overflow-y-auto pt-4 pr-1"
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
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

          <div className="space-y-2">
            <Label htmlFor="shiftTypeId">Shift Template</Label>
            <Select id="shiftTypeId" {...register("shiftTypeId")}>
              <option value="">Select template…</option>
              {shiftTypesQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.startTime} - {t.endTime})
                </option>
              ))}
            </Select>
            {errors.shiftTypeId && (
              <p className="text-xs text-destructive">{errors.shiftTypeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Select employees</Label>
          {!selectedBranch ? (
            <p className="text-xs text-muted-foreground">
              Pick a branch first to see its employees.
            </p>
          ) : employeesQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : employeesQuery.data && employeesQuery.data.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active employees in this branch yet.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-md border p-2">
              {employeesQuery.data?.map((emp) => {
                const checked = selectedEmployees.includes(emp.id);
                return (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleEmployee(emp.id, e.target.checked)}
                    />
                    <span>
                      {emp.firstName} {emp.lastName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {emp.position}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {errors.employeeIds && (
            <p className="text-xs text-destructive">{errors.employeeIds.message}</p>
          )}
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
            Assign Shift
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
