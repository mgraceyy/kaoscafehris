import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
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

export default function MyPayslipsPage() {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["my-payslips"],
    queryFn: listMyPayslips,
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
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-destructive"
                >
                  {extractErrorMessage(query.error, "Failed to load payslips")}
                </TableCell>
              </TableRow>
            )}
            {query.data && query.data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
