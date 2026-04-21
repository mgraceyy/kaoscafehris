import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  adjustPayslip,
  formatCurrency,
  getPayslip,
  type AdjustPayslipInput,
  type DeductionType,
  type EarningType,
} from "./payroll.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string | null;
}

interface EditableEarning {
  type: EarningType;
  label: string;
  amount: string;
}

interface EditableDeduction {
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

const DEDUCTION_TYPES: { value: DeductionType; label: string }[] = [
  { value: "LATE", label: "Late" },
  { value: "SSS", label: "SSS" },
  { value: "PHILHEALTH", label: "PhilHealth" },
  { value: "PAGIBIG", label: "Pag-IBIG" },
  { value: "BIR_TAX", label: "Withholding Tax" },
  { value: "CASH_ADVANCE", label: "Cash Advance" },
  { value: "SALARY_LOAN", label: "Salary Loan" },
  { value: "OTHER", label: "Other" },
];

function toAmount(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function PayslipEditDialog({
  open,
  onOpenChange,
  payslipId,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const payslipQuery = useQuery({
    queryKey: ["payslip", payslipId],
    queryFn: () => getPayslip(payslipId!),
    enabled: open && !!payslipId,
  });

  const [basicPay, setBasicPay] = useState<string>("0");
  const [earnings, setEarnings] = useState<EditableEarning[]>([]);
  const [deductions, setDeductions] = useState<EditableDeduction[]>([]);

  useEffect(() => {
    if (!payslipQuery.data) return;
    const d = payslipQuery.data;
    setBasicPay(String(Number(d.basicPay)));
    setEarnings(
      d.earnings.map((e) => ({
        type: e.type,
        label: e.label,
        amount: String(Number(e.amount)),
      }))
    );
    setDeductions(
      d.deductions.map((x) => ({
        type: x.type,
        label: x.label,
        amount: String(Number(x.amount)),
      }))
    );
  }, [payslipQuery.data]);

  const locked = payslipQuery.data?.payrollRun.status === "COMPLETED";

  const totals = useMemo(() => {
    const bp = toAmount(basicPay);
    const earnSum = earnings.reduce((s, e) => s + toAmount(e.amount), 0);
    const dedSum = deductions.reduce((s, d) => s + toAmount(d.amount), 0);
    const gross = bp + earnSum;
    return { gross, deductions: dedSum, net: gross - dedSum };
  }, [basicPay, earnings, deductions]);

  const mutation = useMutation({
    mutationFn: (input: AdjustPayslipInput) =>
      adjustPayslip(payslipId!, input),
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
      earnings: earnings
        .filter((e) => e.label.trim().length > 0)
        .map((e) => ({
          type: e.type,
          label: e.label.trim(),
          amount: toAmount(e.amount),
        })),
      deductions: deductions
        .filter((d) => d.label.trim().length > 0)
        .map((d) => ({
          type: d.type,
          label: d.label.trim(),
          amount: toAmount(d.amount),
        })),
    });
  }

  function addEarning() {
    setEarnings((xs) => [...xs, { type: "BONUS", label: "", amount: "0" }]);
  }

  function addDeduction() {
    setDeductions((xs) => [
      ...xs,
      { type: "OTHER", label: "", amount: "0" },
    ]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit payslip</DialogTitle>
        <DialogDescription>
          {payslipQuery.data
            ? `${payslipQuery.data.employee.firstName} ${payslipQuery.data.employee.lastName} · ${payslipQuery.data.employee.position}`
            : "Loading…"}
        </DialogDescription>
      </DialogHeader>

      {payslipQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : payslipQuery.data ? (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pt-4 pr-1">
          {locked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              This run is completed — payslip is read-only.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bp">Basic pay (period)</Label>
            <Input
              id="bp"
              type="number"
              step="0.01"
              min="0"
              value={basicPay}
              onChange={(e) => setBasicPay(e.target.value)}
              disabled={locked}
            />
            <p className="text-xs text-muted-foreground">
              Monthly basic: {formatCurrency(payslipQuery.data.employee.basicSalary)} ·
              default is half (bi-monthly).
            </p>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Earnings</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addEarning}
                disabled={locked}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {earnings.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No extra earnings.
              </p>
            )}
            {earnings.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-[120px_1fr_120px_auto]">
                <Select
                  value={row.type}
                  onChange={(e) =>
                    setEarnings((xs) =>
                      xs.map((r, i) =>
                        i === idx ? { ...r, type: e.target.value as EarningType } : r
                      )
                    )
                  }
                  disabled={locked}
                >
                  {EARNING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) =>
                    setEarnings((xs) =>
                      xs.map((r, i) =>
                        i === idx ? { ...r, label: e.target.value } : r
                      )
                    )
                  }
                  disabled={locked}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) =>
                    setEarnings((xs) =>
                      xs.map((r, i) =>
                        i === idx ? { ...r, amount: e.target.value } : r
                      )
                    )
                  }
                  disabled={locked}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setEarnings((xs) => xs.filter((_, i) => i !== idx))
                  }
                  aria-label="Remove"
                  disabled={locked}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Deductions</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addDeduction}
                disabled={locked}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {deductions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No deductions.
              </p>
            )}
            {deductions.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-[120px_1fr_120px_auto]">
                <Select
                  value={row.type}
                  onChange={(e) =>
                    setDeductions((xs) =>
                      xs.map((r, i) =>
                        i === idx ? { ...r, type: e.target.value as DeductionType } : r
                      )
                    )
                  }
                  disabled={locked}
                >
                  {DEDUCTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) =>
                    setDeductions((xs) =>
                      xs.map((r, i) =>
                        i === idx ? { ...r, label: e.target.value } : r
                      )
                    )
                  }
                  disabled={locked}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) =>
                    setDeductions((xs) =>
                      xs.map((r, i) =>
                        i === idx ? { ...r, amount: e.target.value } : r
                      )
                    )
                  }
                  disabled={locked}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setDeductions((xs) => xs.filter((_, i) => i !== idx))
                  }
                  aria-label="Remove"
                  disabled={locked}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Gross</div>
                <div className="font-semibold tabular-nums">
                  {formatCurrency(totals.gross)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Deductions</div>
                <div className="font-semibold tabular-nums text-destructive">
                  {formatCurrency(totals.deductions)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Net</div>
                <div className="font-semibold tabular-nums">
                  {formatCurrency(totals.net)}
                </div>
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
