import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  cancelRun,
  completeRun,
  downloadPayslipPdf,
  downloadRunPdf,
  downloadRunXlsx,
  formatCurrency,
  getRun,
  processRun,
  type PayrollStatus,
} from "./payroll.api";
import PayslipEditDialog from "./payslip-edit-dialog";

function statusBadge(status: PayrollStatus) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="muted">Draft</Badge>;
    case "PROCESSING":
      return <Badge variant="warn">Processing</Badge>;
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>;
  }
}

export default function PayrollRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editPayslipId, setEditPayslipId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const runQuery = useQuery({
    queryKey: ["payroll-run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  });

  const process = useMutation({
    mutationFn: () => processRun(runId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-run", runId] });
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast("Payslips generated", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const complete = useMutation({
    mutationFn: () => completeRun(runId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-run", runId] });
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast("Payroll run completed", "success");
      setCompleteOpen(false);
    },
    onError: (err) => {
      toast(extractErrorMessage(err), "error");
      setCompleteOpen(false);
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelRun(runId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast("Payroll run cancelled", "success");
      navigate("/payroll");
    },
    onError: (err) => {
      toast(extractErrorMessage(err), "error");
      setCancelOpen(false);
    },
  });

  const pdfExport = useMutation({
    mutationFn: (filename: string) => downloadRunPdf(runId!, filename),
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const xlsxExport = useMutation({
    mutationFn: (filename: string) => downloadRunXlsx(runId!, filename),
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const payslipPdf = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      downloadPayslipPdf(id, filename),
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  if (runQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!runQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-destructive">
          {extractErrorMessage(runQuery.error, "Payroll run not found")}
        </p>
        <Link
          to="/payroll"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to runs
        </Link>
      </div>
    );
  }

  const run = runQuery.data;
  const canProcess = run.status === "DRAFT" || run.status === "PROCESSING";
  const canComplete = run.status === "PROCESSING";
  const canCancel = run.status === "DRAFT" || run.status === "PROCESSING";
  const canEdit = run.status !== "COMPLETED" && run.status !== "CANCELLED";

  const canExport = run.payslips.length > 0;
  const filenameBase = `payroll_${run.branch.name.replace(/[^\w-]+/g, "-")}_${run.periodStart.slice(0, 10)}_to_${run.periodEnd.slice(0, 10)}`;

  const totals = run.payslips.reduce(
    (acc, p) => {
      acc.gross += Number(p.grossPay);
      acc.deductions += Number(p.totalDeductions);
      acc.net += Number(p.netPay);
      return acc;
    },
    { gross: 0, deductions: 0, net: 0 }
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <Link
          to="/payroll"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to runs
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {run.branch.name}
            </h1>
            {statusBadge(run.status)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Period: {run.periodStart.slice(0, 10)} → {run.periodEnd.slice(0, 10)}
            {run.processedAt &&
              ` · processed ${new Date(run.processedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canProcess && (
            <Button
              onClick={() => process.mutate()}
              disabled={process.isPending}
            >
              {process.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {run.status === "DRAFT" ? "Process" : "Re-process"}
            </Button>
          )}
          {canComplete && (
            <Button
              variant="outline"
              onClick={() => setCompleteOpen(true)}
              disabled={complete.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete run
            </Button>
          )}
          {canExport && (
            <>
              <Button
                variant="outline"
                onClick={() => pdfExport.mutate(`${filenameBase}.pdf`)}
                disabled={pdfExport.isPending}
              >
                {pdfExport.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => xlsxExport.mutate(`${filenameBase}.xlsx`)}
                disabled={xlsxExport.isPending}
              >
                {xlsxExport.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Export Excel
              </Button>
            </>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setCancelOpen(true)}
              disabled={cancel.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Total Gross
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {formatCurrency(totals.gross)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Total Deductions
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-destructive">
            {formatCurrency(totals.deductions)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Total Net
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {formatCurrency(totals.net)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.payslips.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No payslips yet — click <strong>Process</strong> to generate.
                </TableCell>
              </TableRow>
            )}
            {run.payslips.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">
                    {p.employee.firstName} {p.employee.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.employee.employeeId} · {p.employee.position}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.basicPay)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.grossPay)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {formatCurrency(p.totalDeductions)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(p.netPay)}
                </TableCell>
                <TableCell className="space-x-1 whitespace-nowrap text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      payslipPdf.mutate({
                        id: p.id,
                        filename: `payslip_${p.employee.employeeId}_${run.periodStart.slice(0, 10)}.pdf`,
                      })
                    }
                    disabled={payslipPdf.isPending}
                    aria-label="Download PDF"
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditPayslipId(p.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {canEdit ? "Edit" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PayslipEditDialog
        open={!!editPayslipId}
        onOpenChange={(open) => !open && setEditPayslipId(null)}
        payslipId={editPayslipId}
      />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete payroll run?"
        description="All payslips will be finalized and locked. This cannot be undone."
        confirmLabel="Complete"
        loading={complete.isPending}
        onConfirm={() => complete.mutate()}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel payroll run?"
        description="The run and all its payslips will be deleted. This cannot be undone."
        confirmLabel="Delete run"
        destructive
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  );
}
