import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listDeductions } from "@/features/deductions/deductions.api";
import {
  listEmployeeDeductions,
  addEmployeeDeduction,
  removeEmployeeDeduction,
  updateEmployeeDeduction,
} from "./employee-deductions.api";
import type { Employee } from "./employees.api";

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmployeeDeductionsDialog({ employee, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showAddRow, setShowAddRow] = useState(false);
  const [selectedDeductionId, setSelectedDeductionId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [totalBalanceInput, setTotalBalanceInput] = useState("");

  const empDeductionsQuery = useQuery({
    queryKey: ["employee-deductions", employee?.id],
    queryFn: () => listEmployeeDeductions(employee!.id),
    enabled: open && !!employee?.id,
  });

  const allDeductionsQuery = useQuery({
    queryKey: ["deductions"],
    queryFn: listDeductions,
    enabled: open,
  });

  const assigned = empDeductionsQuery.data ?? [];
  const availableDeductions = (allDeductionsQuery.data ?? []).filter(
    (d) => !assigned.some((a) => a.deductionId === d.id)
  );

  function resetAddForm() {
    setSelectedDeductionId("");
    setAmountInput("");
    setTotalBalanceInput("");
    setShowAddRow(false);
  }

  const addMutation = useMutation({
    mutationFn: () =>
      addEmployeeDeduction(employee!.id, {
        deductionId: selectedDeductionId,
        amount: amountInput ? parseFloat(amountInput) : null,
        totalBalance: totalBalanceInput ? parseFloat(totalBalanceInput) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-deductions", employee?.id] });
      toast("Deduction assigned", "success");
      resetAddForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (edId: string) => removeEmployeeDeduction(employee!.id, edId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-deductions", employee?.id] });
      toast("Deduction removed", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const resetPaidMutation = useMutation({
    mutationFn: (edId: string) =>
      updateEmployeeDeduction(employee!.id, edId, { paidAmount: 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-deductions", employee?.id] });
      toast("Balance reset", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function handleClose(open: boolean) {
    if (!open) resetAddForm();
    onOpenChange(open);
  }

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Deductions — {employee.firstName} {employee.lastName}
          </DialogTitle>
          <DialogDescription>
            {employee.employeeId} · {employee.position} · {employee.branch.name}
            <br />
            These deductions will be auto-applied when payroll is generated for this employee.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          {/* Table */}
          {empDeductionsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deduction</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per Payroll</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Balance</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remaining</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {assigned.length === 0 && !showAddRow && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground italic">
                        No deductions assigned yet.
                      </td>
                    </tr>
                  )}

                  {assigned.map((ed) => {
                    const effectiveAmount = toNum(ed.amount ?? ed.deduction.amount);
                    const totalBalance = ed.totalBalance ? toNum(ed.totalBalance) : null;
                    const paidAmount = toNum(ed.paidAmount);
                    const remaining = totalBalance !== null ? Math.max(0, totalBalance - paidAmount) : null;
                    const isSettled = totalBalance !== null && paidAmount >= totalBalance;

                    return (
                      <tr
                        key={ed.id}
                        className={`border-b last:border-b-0 ${isSettled ? "bg-amber-50" : "hover:bg-muted/20"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{ed.deduction.name}</span>
                            {isSettled && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                Settled
                              </span>
                            )}
                            {!totalBalance && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                Recurring
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(effectiveAmount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {totalBalance !== null ? fmt(totalBalance) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {totalBalance !== null ? fmt(paidAmount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {remaining !== null ? (
                            <span className={isSettled ? "text-amber-600" : "text-gray-800"}>
                              {isSettled ? "₱0.00" : fmt(remaining)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isSettled && (
                              <button
                                type="button"
                                title="Reset paid amount (re-use this deduction)"
                                onClick={() => resetPaidMutation.mutate(ed.id)}
                                disabled={resetPaidMutation.isPending}
                                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                              >
                                Reset
                              </button>
                            )}
                            <button
                              type="button"
                              title="Remove deduction"
                              onClick={() => removeMutation.mutate(ed.id)}
                              disabled={removeMutation.isPending}
                              className="rounded p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Inline add row */}
                  {showAddRow && (
                    <tr className="border-b border-dashed bg-muted/10">
                      <td className="px-3 py-2.5">
                        <select
                          value={selectedDeductionId}
                          onChange={(e) => setSelectedDeductionId(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                          autoFocus
                        >
                          <option value="" disabled>— select deduction —</option>
                          {availableDeductions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({fmt(Number(d.amount))})
                            </option>
                          ))}
                          {availableDeductions.length === 0 && (
                            <option disabled>All deductions already assigned</option>
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Override (optional)"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-3 py-2.5" colSpan={2}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Total balance (blank = recurring)"
                          value={totalBalanceInput}
                          onChange={(e) => setTotalBalanceInput(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:border-primary"
                        />
                      </td>
                      <td />
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={resetAddForm}
                            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!selectedDeductionId || addMutation.isPending}
                            onClick={() => addMutation.mutate()}
                            className="h-7 text-xs"
                          >
                            {addMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : "Save"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Add button below table */}
          {!showAddRow && !empDeductionsQuery.isLoading && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddRow(true)}
                className="gap-1.5"
                disabled={availableDeductions.length === 0 && allDeductionsQuery.isSuccess}
              >
                <Plus className="h-3.5 w-3.5" />
                Assign Deduction
              </Button>
              {allDeductionsQuery.isSuccess && availableDeductions.length === 0 && assigned.length > 0 && (
                <span className="ml-3 text-xs text-muted-foreground">All deductions already assigned.</span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Close</Button>
        </DialogFooter>
    </Dialog>
  );
}
