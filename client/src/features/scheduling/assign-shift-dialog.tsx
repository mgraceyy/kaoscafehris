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
import { createShift, type AssignEmployeeEntry } from "./scheduling.api";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: "",
      shiftTypeId: "",
      dateFrom: initialDate ?? today,
    },
  });

  const selectedBranch = watch("branchId");
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
    queryKey: ["employees", { status: "ACTIVE" }],
    queryFn: () => listEmployees({ status: "ACTIVE" }),
    enabled: open,
    select: (data) => data.filter((e) => e.position !== "Administrator"),
  });

  useEffect(() => {
    if (open) {
      const start = initialDate ?? today;
      reset({ branchId: "", shiftTypeId: "", dateFrom: start });
      setRecurrence(defaultRecurrence(start));
      setSelectedIds(new Set());
      setSearch("");
    }
  }, [open, reset, initialDate]);

  useEffect(() => {
    if (dateFrom) {
      setRecurrence((prev) => ({
        ...prev,
        endsOnDate: prev.endsOnDate < dateFrom ? dateFrom : prev.endsOnDate,
      }));
    }
  }, [dateFrom]);

  const dates = expandRecurrenceDates(dateFrom, recurrence);

  const filteredEmployees = (employeesQuery.data ?? []).filter((emp) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(q) ||
      emp.lastName.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q) ||
      emp.branch.name.toLowerCase().includes(q)
    );
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const shiftType = shiftTypesQuery.data?.find((t) => t.id === values.shiftTypeId);
      if (!shiftType) throw new Error("Shift template not found");
      if (dates.length === 0) throw new Error("No dates match this recurrence");
      if (selectedIds.size === 0) throw new Error("Select at least one employee");

      // All selected employees are assigned to the shift's branch
      const employees: AssignEmployeeEntry[] = [...selectedIds].map((employeeId) => ({
        employeeId,
        assignedBranchId: values.branchId,
      }));

      await Promise.all(
        dates.map((d) =>
          createShift({
            branchId: values.branchId,
            shiftTypeId: values.shiftTypeId,
            name: shiftType.name,
            date: d,
            employees,
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  const branches = branchesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Assign Shift</DialogTitle>
        <DialogDescription>
          Select a branch, shift template, recurrence, and employees to assign.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-h-[75vh] space-y-4 overflow-y-auto pt-4 pr-1"
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="branchId">Assigned Branch</Label>
            <Select id="branchId" {...register("branchId")}>
              <option value="">Select branch…</option>
              {branches.map((b) => (
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
            <Select id="shiftTypeId" {...register("shiftTypeId")} disabled={!selectedBranch}>
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
          <Label>
            Select employees
            {selectedIds.size > 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({selectedIds.size} selected)
              </span>
            )}
          </Label>
          <Input
            placeholder="Search by name, ID, position or branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {employeesQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : employeesQuery.data?.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active employees found.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {filteredEmployees.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">No employees match your search.</p>
              ) : filteredEmployees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={(e) => toggleEmployee(emp.id, e.target.checked)}
                  />
                  <span className="flex-1">
                    {emp.firstName} {emp.lastName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {emp.position}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{emp.branch.name}</span>
                </label>
              ))}
            </div>
          )}
          {mutation.isError && selectedIds.size === 0 && (
            <p className="text-xs text-destructive">Select at least one employee</p>
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
