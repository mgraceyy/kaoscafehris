import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Eye, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  downloadPayslipPdf,
  formatCurrency,
  listMyPayslips,
} from "./payroll.api";
import { getMyPayslipDetail } from "@/features/portal/portal.api";
import { PayslipPreview } from "./payslip-view-dialog";

export default function MyPayslipsPage() {
  const { toast } = useToast();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["my-payslips"],
    queryFn: listMyPayslips,
  });

  const previewQuery = useQuery({
    queryKey: ["my-payslip-detail", previewId],
    queryFn: () => getMyPayslipDetail(previewId!),
    enabled: !!previewId,
  });

  const download = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      downloadPayslipPdf(id, filename),
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My payslips</h1>
        <p className="text-sm text-muted-foreground">
          Released payslips for every payroll period you've been included in.
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {query.isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  {extractErrorMessage(query.error, "Failed to load payslips")}
                </TableCell>
              </TableRow>
            )}
            {query.data && query.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No released payslips yet.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {p.payrollRun.periodStart.slice(0, 10)} →{" "}
                  {p.payrollRun.periodEnd.slice(0, 10)}
                </TableCell>
                <TableCell>{p.payrollRun.branch.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.grossPay)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {formatCurrency(p.totalDeductions)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(p.netPay)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewId(p.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        download.mutate({
                          id: p.id,
                          filename: `payslip_${p.payrollRun.periodStart.slice(0, 10)}.pdf`,
                        })
                      }
                      disabled={download.isPending}
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Payslip preview panel */}
      {previewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <button
              onClick={() => setPreviewId(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 shadow hover:bg-white transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>

            {previewQuery.isLoading ? (
              <div className="flex justify-center py-16 bg-white rounded-2xl">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : previewQuery.data ? (
              <PayslipPreview data={previewQuery.data} />
            ) : (
              <div className="flex justify-center py-16 bg-white rounded-2xl text-sm text-destructive">
                {extractErrorMessage(previewQuery.error, "Failed to load payslip")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
