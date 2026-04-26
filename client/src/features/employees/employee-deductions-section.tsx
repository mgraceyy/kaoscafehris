import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listDeductions } from "@/features/deductions/deductions.api";
import {
  listEmployeeDeductions,
  addEmployeeDeduction,
  removeEmployeeDeduction,
  updateEmployeeDeduction,
} from "./employee-deductions.api";

const BRAND = "#8C1515";

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  employeeId: string;
}

export default function EmployeeDeductionsSection({ employeeId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedDeductionId, setSelectedDeductionId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [totalBalanceInput, setTotalBalanceInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const empDeductionsQuery = useQuery({
    queryKey: ["employee-deductions", employeeId],
    queryFn: () => listEmployeeDeductions(employeeId),
    enabled: !!employeeId,
  });

  const allDeductionsQuery = useQuery({
    queryKey: ["deductions"],
    queryFn: listDeductions,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addEmployeeDeduction(employeeId, {
        deductionId: selectedDeductionId,
        amount: amountInput ? parseFloat(amountInput) : null,
        totalBalance: totalBalanceInput ? parseFloat(totalBalanceInput) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-deductions", employeeId] });
      toast("Deduction assigned", "success");
      setSelectedDeductionId("");
      setAmountInput("");
      setTotalBalanceInput("");
      setShowAddForm(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (edId: string) => removeEmployeeDeduction(employeeId, edId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-deductions", employeeId] });
      toast("Deduction removed", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const resetPaidMutation = useMutation({
    mutationFn: (edId: string) =>
      updateEmployeeDeduction(employeeId, edId, { paidAmount: 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-deductions", employeeId] });
      toast("Balance reset to zero", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const assigned = empDeductionsQuery.data ?? [];
  const availableDeductions = (allDeductionsQuery.data ?? []).filter(
    (d) => !assigned.some((a) => a.deductionId === d.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND }}>
          Deductions
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-3 w-3" /> Assign
          </button>
        )}
      </div>

      {empDeductionsQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      ) : assigned.length === 0 && !showAddForm ? (
        <p className="text-xs text-gray-400 italic py-1">No deductions assigned.</p>
      ) : (
        <div className="space-y-2">
          {assigned.map((ed) => {
            const effectiveAmount = toNum(ed.amount ?? ed.deduction.amount);
            const totalBalance = ed.totalBalance ? toNum(ed.totalBalance) : null;
            const paidAmount = toNum(ed.paidAmount);
            const remaining = totalBalance !== null ? Math.max(0, totalBalance - paidAmount) : null;
            const isSettled = totalBalance !== null && paidAmount >= totalBalance;

            return (
              <div
                key={ed.id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  isSettled ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 truncate">
                        {ed.deduction.name}
                      </span>
                      {isSettled && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Settled — remove
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 space-x-3">
                      <span>₱{effectiveAmount.toLocaleString()} / payroll</span>
                      {totalBalance !== null && (
                        <>
                          <span>·</span>
                          <span>
                            Balance: ₱{remaining!.toLocaleString()} of ₱{totalBalance.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSettled && (
                      <button
                        type="button"
                        title="Reset paid amount to zero (re-use deduction)"
                        onClick={() => resetPaidMutation.mutate(ed.id)}
                        disabled={resetPaidMutation.isPending}
                        className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(ed.id)}
                      disabled={removeMutation.isPending}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {showAddForm && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 space-y-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Deduction *
                </label>
                <select
                  value={selectedDeductionId}
                  onChange={(e) => setSelectedDeductionId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400 bg-white"
                >
                  <option value="" disabled>— select —</option>
                  {availableDeductions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.amount ? `(₱${Number(d.amount).toLocaleString()})` : ""}
                    </option>
                  ))}
                  {availableDeductions.length === 0 && (
                    <option disabled>All deductions already assigned</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Override Amount / Payroll
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Leave blank = default"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Total Balance (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Blank = recurring"
                    value={totalBalanceInput}
                    onChange={(e) => setTotalBalanceInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedDeductionId("");
                    setAmountInput("");
                    setTotalBalanceInput("");
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedDeductionId || addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: BRAND }}
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Assign
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
