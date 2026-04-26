import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { listDeductions } from "@/features/deductions/deductions.api";
import {
  adjustPayslip,
  formatCurrency,
  getPayslip,
  type AdjustPayslipInput,
  type EarningType,
  type DeductionType,
} from "./payroll.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string | null;
}

interface EarningRow {
  _id: string;
  type: EarningType;
  label: string;
  amount: string;
}

// selectedTabId = tab deduction id, "custom" for manual entry, or "" (unselected)
interface DeductionRow {
  _id: string;
  selectedTabId: string;
  type: DeductionType;
  label: string;
  amount: string;
}

const EARNING_TYPES: { value: EarningType; label: string }[] = [
  { value: "OVERTIME", label: "Overtime" },
  { value: "BONUS", label: "Bonus" },
  { value: "ALLOWANCE", label: "Allowance" },
  { value: "HOLIDAY_PAY", label: "Holiday Pay" },
  { value: "OTHER", label: "Other" },
];

function defaultEarningLabel(type: EarningType): string {
  return EARNING_TYPES.find((t) => t.value === type)?.label ?? type;
}

function tabTypeToDeductionType(type: string | null | undefined): DeductionType {
  const valid: DeductionType[] = ["SSS", "PHILHEALTH", "PAGIBIG", "BIR_TAX", "LATE", "CASH_ADVANCE", "SALARY_LOAN", "OTHER"];
  return valid.includes(type as DeductionType) ? (type as DeductionType) : "OTHER";
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

function toAmount(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function PayslipEditDialog({ open, onOpenChange, payslipId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [basicPay, setBasicPay] = useState("0");
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);

  const payslipQuery = useQuery({
    queryKey: ["payslip", payslipId],
    queryFn: () => getPayslip(payslipId!),
    enabled: open && !!payslipId,
  });

  const deductionsQuery = useQuery({
    queryKey: ["deductions"],
    queryFn: listDeductions,
    enabled: open,
  });

  useEffect(() => {
    if (!payslipQuery.data) return;
    const d = payslipQuery.data;
    const templates = deductionsQuery.data ?? [];
    setBasicPay(String(Number(d.basicPay)));
    setEarnings(
      d.earnings.map((e) => ({
        _id: uid(),
        type: e.type as EarningType,
        label: e.label,
        amount: String(Number(e.amount)),
      }))
    );
    setDeductions(
      d.deductions.map((x) => {
        const match = templates.find((t) => t.name === x.label);
        return {
          _id: uid(),
          selectedTabId: match ? match.id : "custom",
          type: x.type as DeductionType,
          label: x.label,
          amount: String(Number(x.amount)),
        };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payslipQuery.data]);

  const locked = payslipQuery.data?.payrollRun.status === "COMPLETED";

  const totals = useMemo(() => {
    const bp = toAmount(basicPay);
    const earnTotal = earnings.reduce((s, r) => s + toAmount(r.amount), 0);
    const dedTotal = deductions.reduce((s, r) => s + toAmount(r.amount), 0);
    const gross = bp + earnTotal;
    return { gross, deductions: dedTotal, net: gross - dedTotal };
  }, [basicPay, earnings, deductions]);

  const mutation = useMutation({
    mutationFn: (input: AdjustPayslipInput) => adjustPayslip(payslipId!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-run", payslipQuery.data?.payrollRunId] });
      qc.invalidateQueries({ queryKey: ["payslip", payslipId] });
      toast("Payslip updated", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function submit() {
    mutation.mutate({
      basicPay: toAmount(basicPay),
      earnings: earnings.map((r) => ({
        type: r.type,
        label: r.label || defaultEarningLabel(r.type),
        amount: toAmount(r.amount),
      })),
      deductions: deductions
        .filter((r) => r.selectedTabId !== "") // exclude unselected rows
        .map((r) => ({
          type: r.type,
          label: r.label,
          amount: toAmount(r.amount),
        })),
    });
  }


  function updateEarning(_id: string, patch: Partial<Omit<EarningRow, "_id">>) {
    setEarnings((prev) =>
      prev.map((r) => (r._id === _id ? { ...r, ...patch } : r))
    );
  }

  function selectTabDeduction(_id: string, tabId: string) {
    const tabItem = deductionsQuery.data?.find((d) => d.id === tabId);
    if (!tabItem) return;
    setDeductions((prev) =>
      prev.map((r) =>
        r._id === _id
          ? {
              ...r,
              selectedTabId: tabId,
              type: tabTypeToDeductionType(tabItem.type),
              label: tabItem.name,
              amount: String(Number(tabItem.amount)),
            }
          : r
      )
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          {payslipQuery.data
            ? `${payslipQuery.data.employee.firstName} ${payslipQuery.data.employee.lastName}`
            : "Payslip"}
        </DialogTitle>
        <DialogDescription>
          {payslipQuery.data
            ? `${payslipQuery.data.employee.position} · ${payslipQuery.data.payrollRun.periodStart.slice(0, 10)} → ${payslipQuery.data.payrollRun.periodEnd.slice(0, 10)}`
            : "Loading…"}
        </DialogDescription>
      </DialogHeader>

      {payslipQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : payslipQuery.data ? (
        <div className="max-h-[72vh] space-y-5 overflow-y-auto pt-4 pr-1">
          {locked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              This run is finalized — payslip is read-only.
            </div>
          )}

          {/* Basic pay */}
          <div className="space-y-1.5">
            <Label htmlFor="bp">Basic Pay (this period)</Label>
            <Input
              id="bp"
              type="number"
              step="0.01"
              min="0"
              value={basicPay}
              onChange={(e) => setBasicPay(e.target.value)}
              disabled={locked}
              className="text-right tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Auto-computed from attendance and pay rate. Override only if needed.
            </p>
          </div>

          {/* Earnings */}
          <div className="space-y-2">
            <div className="border-b pb-1">
              <h3 className="text-sm font-semibold text-gray-700">Earnings</h3>
            </div>

            {earnings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">No additional earnings.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[130px_1fr_100px_32px] gap-2 px-0.5">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-xs text-muted-foreground">Label</span>
                  <span className="text-xs text-muted-foreground text-right">Amount</span>
                  <span />
                </div>
                {earnings.map((row) => (
                  <div key={row._id} className="grid grid-cols-[130px_1fr_100px_32px] gap-2 items-center">
                    <select
                      value={row.type}
                      disabled={locked}
                      onChange={(e) => {
                        const type = e.target.value as EarningType;
                        updateEarning(row._id, { type, label: defaultEarningLabel(type) });
                      }}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm w-full"
                    >
                      {EARNING_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <Input
                      value={row.label}
                      disabled={locked}
                      onChange={(e) => updateEarning(row._id, { label: e.target.value })}
                      placeholder="Label"
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.amount}
                      disabled={locked}
                      onChange={(e) => updateEarning(row._id, { amount: e.target.value })}
                      className="text-right tabular-nums"
                    />
                    {!locked ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEarnings((prev) => prev.filter((r) => r._id !== row._id))}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : <span />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deductions */}
          <div className="space-y-2">
            <div className="border-b pb-1">
              <h3 className="text-sm font-semibold text-gray-700">Deductions</h3>
            </div>

            {deductions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">No deductions added.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_100px_32px] gap-2 px-0.5">
                  <span className="text-xs text-muted-foreground">Deduction</span>
                  <span className="text-xs text-muted-foreground text-right">Amount</span>
                  <span />
                </div>
                {deductions.map((row) => (
                  <div key={row._id} className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
                      {row.selectedTabId === "custom" ? (
                        /* Auto-populated deduction whose template no longer exists — show label as read-only */
                        <div className="h-9 rounded-md border border-input bg-muted/50 px-2 text-sm flex items-center text-gray-700 truncate">
                          {row.label}
                        </div>
                      ) : (
                        /* Dropdown populated from Deductions tab */
                        <select
                          value={row.selectedTabId}
                          disabled={locked}
                          onChange={(e) => selectTabDeduction(row._id, e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm w-full"
                        >
                          <option value="" disabled>— select deduction —</option>
                          {(deductionsQuery.data ?? []).map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      )}
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.amount}
                        disabled={locked}
                        onChange={(e) =>
                          setDeductions((prev) =>
                            prev.map((r) => (r._id === row._id ? { ...r, amount: e.target.value } : r))
                          )
                        }
                        className="text-right tabular-nums"
                      />
                      {!locked ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeductions((prev) => prev.filter((r) => r._id !== row._id))}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : <span />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Gross</div>
                <div className="font-semibold tabular-nums">{formatCurrency(totals.gross)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Deductions</div>
                <div className="font-semibold tabular-nums text-destructive">
                  {formatCurrency(totals.deductions)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Net Pay</div>
                <div className="text-base font-bold tabular-nums">{formatCurrency(totals.net)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-destructive">
          {extractErrorMessage(payslipQuery.error, "Failed to load payslip")}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={mutation.isPending}
        >
          {locked ? "Close" : "Cancel"}
        </Button>
        {!locked && (
          <Button
            type="button"
            onClick={submit}
            disabled={mutation.isPending || !payslipQuery.data}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
