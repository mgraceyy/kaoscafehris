import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listEmployees } from "@/features/employees/employees.api";
import { listBranches } from "@/features/branches/branches.api";
import { assignEmployees, type AssignEmployeeEntry, type Shift } from "./scheduling.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
}

export default function AssignEmployeesDialog({ open, onOpenChange, shift }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  // Map of employeeId → assignedBranchId override (undefined = use shift branch)
  const [selected, setSelected] = useState<Record<string, string | undefined>>({});

  const employeesQuery = useQuery({
    queryKey: ["employees", { status: "ACTIVE" }],
    queryFn: () => listEmployees({ status: "ACTIVE" }),
    enabled: open && !!shift,
    select: (data) => data.filter((e) => e.position !== "Administrator"),
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", { isActive: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: open,
  });

  useEffect(() => {
    if (open) setSelected({});
  }, [open, shift?.id]);

  const alreadyAssignedIds = new Set(
    shift?.assignments.map((a) => a.employee.id) ?? []
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shift) return;
      const entries = Object.entries(selected);
      if (entries.length === 0) throw new Error("Pick at least one employee");
      const employees: AssignEmployeeEntry[] = entries.map(([employeeId, assignedBranchId]) => ({
        employeeId,
        assignedBranchId,
      }));
      return assignEmployees(shift.id, employees);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast("Assigned successfully", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function toggle(id: string, checked: boolean) {
    setSelected((curr) => {
      if (!checked) {
        const next = { ...curr };
        delete next[id];
        return next;
      }
      return { ...curr, [id]: undefined };
    });
  }

  function setBranchOverride(employeeId: string, branchId: string) {
    setSelected((curr) => ({
      ...curr,
      [employeeId]: branchId || undefined,
    }));
  }

  const available = (employeesQuery.data ?? []).filter(
    (e) => !alreadyAssignedIds.has(e.id)
  );
  const selectedCount = Object.keys(selected).length;
  const branches = branchesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Assign employees</DialogTitle>
        <DialogDescription>
          {shift
            ? `${shift.name} · ${shift.date.slice(0, 10)} · ${shift.branch.name}`
            : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-3 overflow-y-auto pt-4">
        {employeesQuery.isLoading && (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {employeesQuery.isError && (
          <p className="text-sm text-destructive">
            {extractErrorMessage(employeesQuery.error, "Failed to load employees")}
          </p>
        )}
        {employeesQuery.data && available.length === 0 && (
          <p className="text-sm text-muted-foreground">
            All active employees are already assigned.
          </p>
        )}
        {available.length > 0 && (
          <div className="rounded-md border divide-y">
            {available.map((emp) => {
              const isChecked = emp.id in selected;
              const overrideBranchId = selected[emp.id] ?? "";
              return (
                <div key={emp.id} className="px-2 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggle(emp.id, e.target.checked)}
                    />
                    <span className="flex-1">
                      {emp.firstName} {emp.lastName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {emp.position}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{emp.employeeId}</span>
                  </label>
                  {isChecked && (
                    <div className="mt-1.5 ml-6 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Assigned branch:
                      </span>
                      <select
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                        value={overrideBranchId}
                        onChange={(e) => setBranchOverride(emp.id, e.target.value)}
                      >
                        <option value="">
                          Default ({shift?.branch.name})
                        </option>
                        {branches
                          .filter((b) => b.id !== shift?.branchId)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
        <Button
          type="button"
          disabled={mutation.isPending || selectedCount === 0}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Assign {selectedCount ? `(${selectedCount})` : ""}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
