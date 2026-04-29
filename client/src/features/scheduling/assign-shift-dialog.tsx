import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import RecurrencePicker, {
  defaultRecurrence,
  expandRecurrenceDates,
  type RecurrenceConfig,
} from "./recurrence-picker";

function toHHMM(value: string): string {
  const d = new Date(value);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const schema = z.object({
  branchId: z.string().uuid("Select a branch"),
  shiftTypeId: z.string().uuid("Select a shift template"),
  dateFrom: z.string().min(1, "Pick a start date"),
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
  const today = format(new Date(), "yyyy-MM-dd");

  const [recurrence, setRecurrence] = useState<RecurrenceConfig>(
    defaultRecurrence(initialDate ?? today)
  );

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
      dateFrom: initialDate ?? today,
      employeeIds: [],
    },
  });

  const selectedBranch = watch("branchId");
  const selectedEmployees = watch("employeeIds") ?? [];
  const dateFrom = watch("dateFrom");

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: open,
  });

  const shiftTypesQuery = useQuery({
    queryKey: ["shift-types", { branchId: selectedBranch }],
    queryFn: () => listShiftTypes(selectedBranch),
    enabled: open && !!selectedBranch,
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", { branchId: selectedBranch }],
    queryFn: () => listEmployees({ branchId: selectedBranch, status: "ACTIVE" }),
    enabled: open && !!selectedBranch,
    select: (data) => data.filter((e) => e.position !== "Administrator"),
  });

  useEffect(() => {
    if (open) {
      const start = initialDate ?? today;
      reset({ branchId: "", shiftTypeId: "", dateFrom: start, employeeIds: [] });
      setRecurrence(defaultRecurrence(start));
    }
  }, [open, reset, initialDate]);

  // Keep recurrence endsOnDate in sync when dateFrom changes
  useEffect(() => {
    if (dateFrom) {
      setRecurrence((prev) => ({
        ...prev,
        endsOnDate: prev.endsOnDate < dateFrom ? dateFrom : prev.endsOnDate,
      }));
    }
  }, [dateFrom]);

  const dates = expandRecurrenceDates(dateFrom, recurrence);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const shiftType = shiftTypesQuery.data?.find((t) => t.id === values.shiftTypeId);
      if (!shiftType) throw new Error("Shift template not found");
      if (dates.length === 0) throw new Error("No dates match this recurrence");

      await Promise.all(
        dates.map((d) =>
          createShift({
            branchId: values.branchId,
            shiftTypeId: values.shiftTypeId,
            name: shiftType.name,
            date: d,
            employeeIds: values.employeeIds,
          })
        )
      );

      return dates.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast(`${count} shift${count !== 1 ? "s" : ""} created`, "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function toggleEmployee(id: string, checked: boolean) {
    const current = selectedEmployees ?? [];
    const next = checked ? [...current, id] : current.filter((x) => x !== id);
    setValue("employeeIds", next, { shouldDirty: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Assign Shift</DialogTitle>
        <DialogDescription>
          Select a shift template, recurrence, and employees to assign.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-h-[75vh] space-y-4 overflow-y-auto pt-4 pr-1"
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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shiftTypeId">Shift Template</Label>
            <Select id="shiftTypeId" {...register("shiftTypeId")}>
              <option value="">Select template…</option>
              {shiftTypesQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({toHHMM(t.startTime)} - {toHHMM(t.endTime)})
                </option>
              ))}
            </Select>
            {errors.shiftTypeId && (
              <p className="text-xs text-destructive">{errors.shiftTypeId.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dateFrom">Start Date</Label>
            <Input id="dateFrom" type="date" {...register("dateFrom")} />
            {errors.dateFrom && (
              <p className="text-xs text-destructive">{errors.dateFrom.message}</p>
            )}
          </div>
        </div>

        {/* Recurrence */}
        <div className="space-y-2">
          <Label>Recurrence</Label>
          <RecurrencePicker
            value={recurrence}
            onChange={setRecurrence}
            startDate={dateFrom}
          />
        </div>

        {/* Employees */}
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
          <Button type="submit" disabled={mutation.isPending || dates.length === 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {dates.length > 0 ? `Assign ${dates.length} Shift${dates.length !== 1 ? "s" : ""}` : "Assign Shift"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
