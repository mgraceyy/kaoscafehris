import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { listBranches } from "@/features/branches/branches.api";
import {
  downloadReport,
  formatCurrency,
  getAttendanceReport,
  getHeadcountReport,
  getPayrollReport,
  type ReportFormat,
  type ReportParams,
  type ReportType,
} from "./report.api";

type Tab = "attendance" | "payroll" | "headcount";

function firstOfMonth(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
function lastOfMonth(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("attendance");

  const today = useMemo(() => new Date(), []);
  const [branchId, setBranchId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(firstOfMonth(today));
  const [periodEnd, setPeriodEnd] = useState<string>(lastOfMonth(today));

  const branchesQuery = useQuery({
    queryKey: ["branches", {}],
    queryFn: () => listBranches(),
  });

  const params: ReportParams = useMemo(
    () => ({
      branchId: branchId || undefined,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
    }),
    [branchId, periodStart, periodEnd]
  );

  const headcountParams = branchId || undefined;

  const attendanceQuery = useQuery({
    queryKey: ["report", "attendance", params],
    queryFn: () => getAttendanceReport(params),
    enabled: tab === "attendance",
  });

  const payrollQuery = useQuery({
    queryKey: ["report", "payroll", params],
    queryFn: () => getPayrollReport(params),
    enabled: tab === "payroll",
  });

  const headcountQuery = useQuery({
    queryKey: ["report", "headcount", headcountParams],
    queryFn: () => getHeadcountReport(headcountParams),
    enabled: tab === "headcount",
  });

  const exportMut = useMutation({
    mutationFn: ({ format }: { format: ReportFormat }) => {
      const stamp = new Date().toISOString().slice(0, 10);
      const filenameBase =
        tab === "headcount"
          ? `headcount_report_${stamp}`
          : `${tab}_report_${periodStart}_to_${periodEnd}`;
      return downloadReport(
        tab as ReportType,
        format,
        params,
        `${filenameBase}.${format}`
      );
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Analytics across attendance, payroll, and headcount.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {(["attendance", "payroll", "headcount"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="f-branch" className="text-sm font-medium leading-none">
            Branch
          </label>
          <Select
            id="f-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">All branches</option>
            {branchesQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="f-start" className="text-sm font-medium leading-none">
            Period start
          </label>
          <Input
            id="f-start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            disabled={tab === "headcount"}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="f-end" className="text-sm font-medium leading-none">
            Period end
          </label>
          <Input
            id="f-end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            disabled={tab === "headcount"}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => exportMut.mutate({ format: "pdf" })}
            disabled={exportMut.isPending}
          >
            {exportMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => exportMut.mutate({ format: "xlsx" })}
            disabled={exportMut.isPending}
          >
            {exportMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Excel
          </Button>
        </div>
      </div>

      {tab === "attendance" && (
        <AttendanceSection
          loading={attendanceQuery.isLoading}
          error={attendanceQuery.error}
          data={attendanceQuery.data}
        />
      )}
      {tab === "payroll" && (
        <PayrollSection
          loading={payrollQuery.isLoading}
          error={payrollQuery.error}
          data={payrollQuery.data}
        />
      )}
      {tab === "headcount" && (
        <HeadcountSection
          loading={headcountQuery.isLoading}
          error={headcountQuery.error}
          data={headcountQuery.data}
        />
      )}
    </div>
  );
}

interface SectionProps<T> {
  loading: boolean;
  error: unknown;
  data?: T;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "muted" | "destructive";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "destructive" && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StateRow({
  loading,
  error,
  empty,
  colSpan,
  fallback,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  colSpan: number;
  fallback: string;
}) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  }
  if (error) {
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          className="py-10 text-center text-destructive"
        >
          {extractErrorMessage(error, fallback)}
        </TableCell>
      </TableRow>
    );
  }
  if (empty) {
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          className="py-10 text-center text-muted-foreground"
        >
          No data for this period.
        </TableCell>
      </TableRow>
    );
  }
  return null;
}

function AttendanceSection({
  loading,
  error,
  data,
}: SectionProps<import("./report.api").AttendanceReport>) {
  const empty = !loading && !error && (!data || data.totals.totalRecords === 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Total records"
          value={data?.totals.totalRecords ?? 0}
        />
        <StatCard label="Present" value={data?.totals.present ?? 0} />
        <StatCard
          label="Late"
          value={data?.totals.late ?? 0}
          tone="destructive"
        />
        <StatCard label="Absent" value={data?.totals.absent ?? 0} />
        <StatCard
          label="Hours worked"
          value={(data?.totals.totalHoursWorked ?? 0).toFixed(2)}
        />
        <StatCard
          label="Overtime hours"
          value={(data?.totals.totalOvertimeHours ?? 0).toFixed(2)}
        />
        <StatCard
          label="Late minutes"
          value={data?.totals.totalLateMinutes ?? 0}
          tone="destructive"
        />
        <StatCard label="Half day" value={data?.totals.halfDay ?? 0} />
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">By branch</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">Late mins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StateRow
              loading={loading}
              error={error}
              empty={empty}
              colSpan={6}
              fallback="Failed to load attendance report"
            />
            {data?.byBranch.map((b) => (
              <TableRow key={b.branchId}>
                <TableCell className="font-medium">{b.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.totalRecords}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.present}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {b.late}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.absent}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.totalLateMinutes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">
        By employee
      </h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">OT hrs</TableHead>
              <TableHead className="text-right">Late mins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StateRow
              loading={loading}
              error={error}
              empty={empty}
              colSpan={8}
              fallback="Failed to load attendance report"
            />
            {data?.byEmployee.map((e) => (
              <TableRow key={e.employeeId}>
                <TableCell>
                  <div className="font-medium">{e.employeeName}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.employeeCode}
                  </div>
                </TableCell>
                <TableCell>{e.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.present}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {e.late}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.absent}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.totalHoursWorked.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.totalOvertimeHours.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.totalLateMinutes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PayrollSection({
  loading,
  error,
  data,
}: SectionProps<import("./report.api").PayrollReport>) {
  const empty = !loading && !error && (!data || data.totals.runCount === 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <StatCard label="Runs" value={data?.totals.runCount ?? 0} />
        <StatCard label="Payslips" value={data?.totals.payslipCount ?? 0} />
        <StatCard
          label="Total gross"
          value={formatCurrency(data?.totals.totalGross ?? 0)}
        />
        <StatCard
          label="Total deductions"
          value={formatCurrency(data?.totals.totalDeductions ?? 0)}
          tone="destructive"
        />
        <StatCard
          label="Total net"
          value={formatCurrency(data?.totals.totalNet ?? 0)}
        />
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">By branch</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Runs</TableHead>
              <TableHead className="text-right">Payslips</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StateRow
              loading={loading}
              error={error}
              empty={empty}
              colSpan={6}
              fallback="Failed to load payroll report"
            />
            {data?.byBranch.map((b) => (
              <TableRow key={b.branchId}>
                <TableCell className="font-medium">{b.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.runCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.payslipCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(b.totalGross)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {formatCurrency(b.totalDeductions)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(b.totalNet)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">Runs</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Payslips</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StateRow
              loading={loading}
              error={error}
              empty={empty}
              colSpan={6}
              fallback="Failed to load payroll report"
            />
            {data?.runs.map((r) => (
              <TableRow key={r.runId}>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {r.periodStart} → {r.periodEnd}
                </TableCell>
                <TableCell>{r.branchName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.status}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.payslipCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(r.totalGross)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCurrency(r.totalNet)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function HeadcountSection({
  loading,
  error,
  data,
}: SectionProps<import("./report.api").HeadcountReport>) {
  const empty = !loading && !error && (!data || data.totals.total === 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <StatCard label="Active" value={data?.totals.active ?? 0} />
        <StatCard label="Inactive" value={data?.totals.inactive ?? 0} />
        <StatCard label="On leave" value={data?.totals.onLeave ?? 0} />
        <StatCard
          label="Terminated"
          value={data?.totals.terminated ?? 0}
          tone="destructive"
        />
        <StatCard label="Total" value={data?.totals.total ?? 0} />
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">By branch</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Inactive</TableHead>
              <TableHead className="text-right">On leave</TableHead>
              <TableHead className="text-right">Terminated</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StateRow
              loading={loading}
              error={error}
              empty={empty}
              colSpan={6}
              fallback="Failed to load headcount"
            />
            {data?.byBranch.map((b) => (
              <TableRow key={b.branchId}>
                <TableCell className="font-medium">{b.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.active}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.inactive}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.onLeave}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {b.terminated}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {b.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">
        By position
      </h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StateRow
              loading={loading}
              error={error}
              empty={empty}
              colSpan={2}
              fallback="Failed to load headcount"
            />
            {data?.byPosition.map((p) => (
              <TableRow key={p.position}>
                <TableCell>{p.position}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
