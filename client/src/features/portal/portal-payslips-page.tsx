import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { downloadPayslipPdf, listMyPayslips } from "@/features/payroll/payroll.api";
import { PayslipPreview } from "@/features/payroll/payslip-view-dialog";
import { getMyPayslipDetail } from "./portal.api";

const BRAND = "#8C1515";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtPeriodLong(start: string, end: string) {
  const s = new Date(start.slice(0, 10) + "T00:00:00");
  const e = new Date(end.slice(0, 10) + "T00:00:00");
  return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
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
      {/* Page header */}
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
                  {fmtPeriodLong(p.payrollRun.periodStart, p.payrollRun.periodEnd)} – {p.payrollRun.branch.name}
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
          <PayslipPreview data={payslip} />
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
