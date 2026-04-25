import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api";
import { formatCurrency, getPayslip } from "./payroll.api";

const BRAND = "#8C1515";
const GOV_TYPES = new Set(["SSS", "PHILHEALTH", "PAGIBIG", "BIR_TAX"]);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string | null;
}

function fmtPeriod(start: string, end: string): string {
  const s = new Date(start.slice(0, 10) + "T00:00:00");
  const e = new Date(end.slice(0, 10) + "T00:00:00");
  const mo: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `Payslip for ${s.toLocaleDateString("en-US", mo)} – ${e.toLocaleDateString("en-US", { ...mo, year: "numeric" })}`;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5 mt-5">
      {children}
    </p>
  );
}

function Row({
  label,
  value,
  bold,
  red,
}: {
  label: string;
  value: string;
  bold?: boolean;
  red?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "text-gray-900" : "text-gray-500"}>{label}</span>
      <span className={`tabular-nums ${red ? "text-red-600" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

export default function PayslipViewDialog({ open, onOpenChange, payslipId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["payslip", payslipId],
    queryFn: () => getPayslip(payslipId!),
    enabled: open && !!payslipId,
  });

  const govDeductions = data?.deductions.filter((d) => GOV_TYPES.has(d.type)) ?? [];
  const regularDeductions = data?.deductions.filter((d) => !GOV_TYPES.has(d.type)) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Header banner */}
      <div className="rounded-lg px-5 py-4 text-white mb-4" style={{ backgroundColor: BRAND }}>
        <div className="font-bold text-lg tracking-tight">KAOS HRIS</div>
        {data ? (
          <div className="text-sm opacity-80">
            {fmtPeriod(data.payrollRun.periodStart, data.payrollRun.periodEnd)}
          </div>
        ) : (
          <div className="text-sm opacity-60">Loading…</div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-destructive">
          {extractErrorMessage(error, "Failed to load payslip")}
        </p>
      ) : (
        <div className="max-h-[62vh] overflow-y-auto pr-1">
          {/* Employee Information */}
          <SectionLabel>Employee Information</SectionLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Name</div>
              <div className="font-semibold text-sm">
                {data.employee.firstName} {data.employee.lastName}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Employee ID</div>
              <div className="font-semibold text-sm">{data.employee.employeeId}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Position</div>
              <div className="font-semibold text-sm">{data.employee.position}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Branch</div>
              <div className="font-semibold text-sm">{data.employee.branch.name}</div>
            </div>
          </div>

          <hr className="border-gray-100 mt-5" />

          {/* Earnings */}
          <SectionLabel>Earnings</SectionLabel>
          <div className="space-y-2">
            <Row label="Base Salary (bi-monthly)" value={formatCurrency(data.basicPay)} />
            {data.earnings.map((e) => (
              <Row key={e.id} label={e.label} value={formatCurrency(e.amount)} />
            ))}
            <div className="pt-2 border-t border-gray-200">
              <Row label="Gross Pay" value={formatCurrency(data.grossPay)} bold />
            </div>
          </div>

          {/* Deductions */}
          {regularDeductions.length > 0 && (
            <>
              <SectionLabel>Deductions</SectionLabel>
              <div className="space-y-2">
                {regularDeductions.map((d) => (
                  <Row key={d.id} label={d.label} value={formatCurrency(d.amount)} />
                ))}
              </div>
            </>
          )}

          {/* Government Contributions */}
          {govDeductions.length > 0 && (
            <>
              <SectionLabel>Government Contributions</SectionLabel>
              <div className="space-y-2">
                {govDeductions.map((d) => (
                  <Row key={d.id} label={d.label} value={formatCurrency(d.amount)} />
                ))}
              </div>
            </>
          )}

          {/* Summary */}
          <SectionLabel>Summary</SectionLabel>
          <div className="space-y-2">
            <Row label="Gross Pay" value={formatCurrency(data.grossPay)} />
            <Row
              label="Total Deductions"
              value={`- ${formatCurrency(data.totalDeductions)}`}
              red
            />
          </div>

          {/* Net Pay box */}
          <div
            className="mt-3 flex items-center justify-between rounded-lg px-4 py-3"
            style={{ backgroundColor: "#FDF5F5" }}
          >
            <span className="font-semibold text-sm text-gray-900">Net Pay</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: BRAND }}>
              {formatCurrency(data.netPay)}
            </span>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
