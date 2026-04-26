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
import { assignEmployees, type Shift } from "./scheduling.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
}

export default function AssignEmployeesDialog({ open, onOpenChange, shift }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);

  const employeesQuery = useQuery({
    queryKey: ["employees", { branchId: shift?.branchId, status: "ACTIVE" }],
    queryFn: () =>
      listEmployees({ branchId: shift!.branchId, status: "ACTIVE" }),
    enabled: open && !!shift,
    select: (data) => data.filter((e) => e.position !== "Administrator"),
  });

  useEffect(() => {
    if (open) setSelected([]);
  }, [open, shift?.id]);

  const alreadyAssignedIds = new Set(
    shift?.assignments.map((a) => a.employee.id) ?? []
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shift) return;
      if (selected.length === 0) throw new Error("Pick at least one employee");
      return assignEmployees(shift.id, selected);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast("Assigned successfully", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function toggle(id: string, checked: boolean) {
    setSelected((curr) =>
      checked ? [...curr, id] : curr.filter((x) => x !== id)
    );
  }

  const available = (employeesQuery.data ?? []).filter(
    (e) => !alreadyAssignedIds.has(e.id)
  );

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
            All active employees from this branch are already assigned.
          </p>
        )}
        {available.length > 0 && (
          <div className="rounded-md border p-2">
            {available.map((emp) => {
              const checked = selected.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
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
          disabled={mutation.isPending || selected.length === 0}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Assign {selected.length ? `(${selected.length})` : ""}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
