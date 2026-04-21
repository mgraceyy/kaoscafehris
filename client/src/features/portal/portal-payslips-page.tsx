import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { downloadPayslipPdf, formatCurrency, listMyPayslips } from "@/features/payroll/payroll.api";
import { getMyPayslipDetail } from "./portal.api";

const BRAND = "#8C1515";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtPeriod(start: string, end: string) {
  const s = new Date(start.slice(0, 10) + "T00:00:00");
  const e = new Date(end.slice(0, 10) + "T00:00:00");
  return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? "font-semibold" : ""}`}>
      <span className={`text-sm ${bold ? "text-gray-800" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm tabular-nums ${negative ? "text-red-600" : bold ? "text-gray-800" : "text-gray-700"}`}>
        {value}
      </span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 pt-2 pb-1">
      {title}
    </p>
  );
}

export default function PortalPayslipsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");

  const listQuery = useQuery({
    queryKey: ["my-payslips"],
    queryFn: listMyPayslips,
  });

  const currentId = selectedId || listQuery.data?.[0]?.id || "";

  const detailQuery = useQuery({
    queryKey: ["my-payslip-detail", currentId],
    queryFn: () => getMyPayslipDetail(currentId),
    enabled: !!currentId,
  });

  const downloadMut = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      downloadPayslipPdf(id, filename),
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const payslip = detailQuery.data;

  return (
    <div>
      {/* Header */}
      <div className="rounded-b-[28px] px-6 pt-14 pb-6" style={{ backgroundColor: BRAND }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Payslips</h1>
          <img src="/kaos-logo.svg" alt="KAOS" className="h-10 w-auto brightness-0 invert opacity-60" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-4">
        {/* Period selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select Payroll Period</p>
          <div className="relative">
            <select
              value={currentId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full appearance-none rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 shadow-sm pr-10"
              disabled={listQuery.isLoading}
            >
              {listQuery.isLoading && <option>Loading...</option>}
              {listQuery.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {fmtPeriod(p.payrollRun.periodStart, p.payrollRun.periodEnd)} – {p.payrollRun.branch.name}
                </option>
              ))}
              {!listQuery.isLoading && !listQuery.data?.length && (
                <option value="">No payslips available</option>
              )}
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {detailQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : !payslip ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 border border-gray-100">
            No payslip data available.
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Payslip header */}
            <div className="px-5 py-4" style={{ backgroundColor: BRAND }}>
              <p className="text-white font-bold text-lg">KAOS HRIS</p>
              <p className="text-white/80 text-sm mt-0.5">
                Payslip for {fmtPeriod(payslip.payrollRun.periodStart, payslip.payrollRun.periodEnd)}
              </p>
            </div>

            <div className="bg-white px-5 py-4 space-y-1">
              {/* Employee Info */}
              <SectionHeader title="Employee Information" />
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {payslip.employee.firstName} {payslip.employee.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Employee ID</p>
                  <p className="text-sm font-semibold text-gray-800">{payslip.employee.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Position</p>
                  <p className="text-sm font-semibold text-gray-800">{payslip.employee.position}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Branch</p>
                  <p className="text-sm font-semibold text-gray-800">{payslip.employee.branch.name}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Earnings */}
              <SectionHeader title="Earnings" />
              <Row label="Base Salary (bi-monthly)" value={formatCurrency(payslip.basicPay)} />
              <Row label="Overtime Pay" value={formatCurrency(payslip.overtimePay)} />
              <Row label="Bonuses" value={formatCurrency(payslip.bonuses)} />
              {Number(payslip.allowances) > 0 && (
                <Row label="Allowances" value={formatCurrency(payslip.allowances)} />
              )}
              {Number(payslip.holidayPay) > 0 && (
                <Row label="Holiday Pay" value={formatCurrency(payslip.holidayPay)} />
              )}
              {payslip.earnings
                .filter((e) => e.type === "OTHER")
                .map((e) => (
                  <Row key={e.id} label={e.label} value={formatCurrency(e.amount)} />
                ))}
              <Row label="Gross Pay" value={formatCurrency(payslip.grossPay)} bold />

              <div className="border-t border-gray-100" />

              {/* Deductions */}
              <SectionHeader title="Deductions" />
              <Row label="Late / Tardiness Deduction" value={formatCurrency(payslip.lateDeductions)} />
              <Row label="Cash Advances" value={formatCurrency(payslip.cashAdvance)} />
              <Row label="Salary Loans" value={formatCurrency(payslip.salaryLoan)} />
              {payslip.deductions
                .filter((d) => d.type === "OTHER")
                .map((d) => (
                  <Row key={d.id} label={d.label} value={formatCurrency(d.amount)} />
                ))}

              <div className="border-t border-gray-100" />

              {/* Government Contributions */}
              <SectionHeader title="Government Contributions" />
              <Row label="SSS" value={formatCurrency(payslip.sssContribution)} />
              <Row label="PhilHealth" value={formatCurrency(payslip.philhealthContribution)} />
              <Row label="Pag-IBIG" value={formatCurrency(payslip.pagibigContribution)} />
              <Row label="Withholding Tax" value={formatCurrency(payslip.withholdingTax)} />

              <div className="border-t border-gray-100" />

              {/* Summary */}
              <SectionHeader title="Summary" />
              <Row label="Gross Pay" value={formatCurrency(payslip.grossPay)} />
              <Row label="Total Deductions" value={`– ${formatCurrency(payslip.totalDeductions)}`} negative />

              {/* Net Pay */}
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="font-semibold text-gray-800">Net Pay</span>
                <span className="text-xl font-bold tabular-nums" style={{ color: BRAND }}>
                  {formatCurrency(payslip.netPay)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download PDF */}
      {payslip && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-1">
          <button
            onClick={() =>
              downloadMut.mutate({
                id: payslip.id,
                filename: `payslip_${payslip.payrollRun.periodStart.slice(0, 10)}.pdf`,
              })
            }
            disabled={downloadMut.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white shadow-lg"
            style={{ backgroundColor: BRAND }}
          >
            {downloadMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
