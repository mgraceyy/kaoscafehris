import { useEffect, useMemo, useState } from "react";
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
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  adjustPayslip,
  formatCurrency,
  getPayslip,
  type AdjustPayslipInput,
} from "./payroll.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string | null;
}

interface FormState {
  basicPay: string;
  overtimePay: string;
  bonus: string;
  allowance: string;
  holidayPay: string;
  sss: string;
  philhealth: string;
  pagibig: string;
  withholdingTax: string;
  lateDeduction: string;
  cashAdvance: string;
  salaryLoan: string;
}

const ZERO_FORM: FormState = {
  basicPay: "0",
  overtimePay: "0",
  bonus: "0",
  allowance: "0",
  holidayPay: "0",
  sss: "0",
  philhealth: "0",
  pagibig: "0",
  withholdingTax: "0",
  lateDeduction: "0",
  cashAdvance: "0",
  salaryLoan: "0",
};

function toAmount(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function PayslipEditDialog({ open, onOpenChange, payslipId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(ZERO_FORM);

  const payslipQuery = useQuery({
    queryKey: ["payslip", payslipId],
    queryFn: () => getPayslip(payslipId!),
    enabled: open && !!payslipId,
  });

  useEffect(() => {
    if (!payslipQuery.data) return;
    const d = payslipQuery.data;
    const earn = (type: string) =>
      String(Number(d.earnings.find((e) => e.type === type)?.amount ?? 0));
    const deduct = (type: string) =>
      String(Number(d.deductions.find((x) => x.type === type)?.amount ?? 0));
    setForm({
      basicPay: String(Number(d.basicPay)),
      overtimePay: earn("OVERTIME"),
      bonus: earn("BONUS"),
      allowance: earn("ALLOWANCE"),
      holidayPay: earn("HOLIDAY_PAY"),
      sss: deduct("SSS"),
      philhealth: deduct("PHILHEALTH"),
      pagibig: deduct("PAGIBIG"),
      withholdingTax: deduct("BIR_TAX"),
      lateDeduction: deduct("LATE"),
      cashAdvance: deduct("CASH_ADVANCE"),
      salaryLoan: deduct("SALARY_LOAN"),
    });
  }, [payslipQuery.data]);

  const locked = payslipQuery.data?.payrollRun.status === "COMPLETED";

  const totals = useMemo(() => {
    const bp = toAmount(form.basicPay);
    const gross =
      bp +
      toAmount(form.overtimePay) +
      toAmount(form.bonus) +
      toAmount(form.allowance) +
      toAmount(form.holidayPay);
    const dedTotal =
      toAmount(form.sss) +
      toAmount(form.philhealth) +
      toAmount(form.pagibig) +
      toAmount(form.withholdingTax) +
      toAmount(form.lateDeduction) +
      toAmount(form.cashAdvance) +
      toAmount(form.salaryLoan);
    return { gross, deductions: dedTotal, net: gross - dedTotal };
  }, [form]);

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
    const allEarnings: AdjustPayslipInput["earnings"] = [
      { type: "OVERTIME", label: "Overtime", amount: toAmount(form.overtimePay) },
      { type: "BONUS", label: "Bonus", amount: toAmount(form.bonus) },
      { type: "ALLOWANCE", label: "Allowance", amount: toAmount(form.allowance) },
      { type: "HOLIDAY_PAY", label: "Holiday Pay", amount: toAmount(form.holidayPay) },
    ];
    const allDeductions: AdjustPayslipInput["deductions"] = [
      { type: "SSS", label: "SSS", amount: toAmount(form.sss) },
      { type: "PHILHEALTH", label: "PhilHealth", amount: toAmount(form.philhealth) },
      { type: "PAGIBIG", label: "Pag-IBIG", amount: toAmount(form.pagibig) },
      { type: "BIR_TAX", label: "Withholding Tax", amount: toAmount(form.withholdingTax) },
      { type: "LATE", label: "Late Deduction", amount: toAmount(form.lateDeduction) },
      { type: "CASH_ADVANCE", label: "Cash Advance", amount: toAmount(form.cashAdvance) },
      { type: "SALARY_LOAN", label: "Salary Loan", amount: toAmount(form.salaryLoan) },
    ];
    mutation.mutate({
      basicPay: toAmount(form.basicPay),
      earnings: allEarnings.filter((e) => e.amount > 0),
      deductions: allDeductions.filter((d) => d.amount > 0),
    });
  }

  function numField(label: string, key: keyof FormState) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">{label}</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          disabled={locked}
          className="text-right tabular-nums"
        />
      </div>
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
              value={form.basicPay}
              onChange={(e) => setForm({ ...form, basicPay: e.target.value })}
              disabled={locked}
              className="text-right tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Monthly salary: {formatCurrency(payslipQuery.data.employee.basicSalary)} · default is half for bi-monthly
            </p>
          </div>

          {/* Earnings | Deductions side by side */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Earnings</h3>
              {numField("Overtime Pay", "overtimePay")}
              {numField("Bonus", "bonus")}
              {numField("Allowance", "allowance")}
              {numField("Holiday Pay", "holidayPay")}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Deductions</h3>
              {numField("SSS", "sss")}
              {numField("PhilHealth", "philhealth")}
              {numField("Pag-IBIG", "pagibig")}
              {numField("Withholding Tax", "withholdingTax")}
              {numField("Late Deduction", "lateDeduction")}
              {numField("Cash Advance", "cashAdvance")}
              {numField("Salary Loan", "salaryLoan")}
            </div>
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
