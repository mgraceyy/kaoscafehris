import { useMemo, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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

const BRAND = "#8C1515";
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

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportOpen]);

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

  const TAB_LABELS: Record<Tab, string> = {
    attendance: "Attendance",
    payroll: "Payroll",
    headcount: "Headcount",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Analytics across attendance, payroll, and headcount.
          </p>
        </div>
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={exportMut.isPending}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            {exportMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border bg-white shadow-md py-1">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { exportMut.mutate({ format: "pdf" }); setExportOpen(false); }}
                disabled={exportMut.isPending}
              >
                <FileText className="h-4 w-4 text-gray-400" />
                PDF
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { exportMut.mutate({ format: "xlsx" }); setExportOpen(false); }}
                disabled={exportMut.isPending}
              >
                <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm w-fit">
        {(["attendance", "payroll", "headcount"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
            style={tab === t ? { backgroundColor: BRAND } : undefined}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <p className="mb-1.5 text-xs font-medium text-gray-500">Branch</p>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All Branches</option>
              {branchesQuery.data?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <p className="mb-1.5 text-xs font-medium text-gray-500">Period Start</p>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              disabled={tab === "headcount"}
              className="text-sm"
            />
          </div>
          <div className="min-w-[160px]">
            <p className="mb-1.5 text-xs font-medium text-gray-500">Period End</p>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              disabled={tab === "headcount"}
              className="text-sm"
            />
          </div>
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
  accent,
}: {
  label: string;
  value: string | number;
  tone?: "destructive";
  accent?: boolean;
}) {
  const borderColor = accent ? BRAND : tone === "destructive" ? "#DC2626" : "#D4A0A0";
  const valueColor = accent ? BRAND : tone === "destructive" ? "#DC2626" : "#111827";

  return (
    <div
      className="rounded-xl border bg-white p-4 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
      <div className="flex-1 border-t border-gray-100" />
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
        <TableCell colSpan={colSpan} className="py-14 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
        </TableCell>
      </TableRow>
    );
  }
  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-14 text-center text-sm text-red-500">
          {extractErrorMessage(error, fallback)}
        </TableCell>
      </TableRow>
    );
  }
  if (empty) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-14 text-center text-sm text-gray-400">
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Total Records" value={data?.totals.totalRecords ?? 0} accent />
        <StatCard label="Present" value={data?.totals.present ?? 0} />
        <StatCard label="Late" value={data?.totals.late ?? 0} tone="destructive" />
        <StatCard label="Absent" value={data?.totals.absent ?? 0} />
        <StatCard label="Hours Worked" value={(data?.totals.totalHoursWorked ?? 0).toFixed(2)} />
        <StatCard label="Overtime Hours" value={(data?.totals.totalOvertimeHours ?? 0).toFixed(2)} />
        <StatCard label="Late Minutes" value={data?.totals.totalLateMinutes ?? 0} tone="destructive" />
        <StatCard label="Half Day" value={data?.totals.halfDay ?? 0} />
      </div>

      <SectionDivider title="By Branch" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50/60">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branch</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Present</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Late</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Absent</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Late Mins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            <StateRow loading={loading} error={error} empty={empty} colSpan={6} fallback="Failed to load attendance report" />
            {data?.byBranch.map((b) => (
              <TableRow key={b.branchId} className="hover:bg-[#FAF5F5]">
                <TableCell className="font-medium" style={{ color: BRAND }}>{b.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">{b.totalRecords}</TableCell>
                <TableCell className="text-right tabular-nums">{b.present}</TableCell>
                <TableCell className="text-right tabular-nums text-red-500">{b.late}</TableCell>
                <TableCell className="text-right tabular-nums">{b.absent}</TableCell>
                <TableCell className="text-right tabular-nums">{b.totalLateMinutes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SectionDivider title="By Employee" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50/60">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Employee</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branch</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Present</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Late</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Absent</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Hours</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">OT Hrs</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Late Mins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            <StateRow loading={loading} error={error} empty={empty} colSpan={8} fallback="Failed to load attendance report" />
            {data?.byEmployee.map((e) => (
              <TableRow key={e.employeeId} className="hover:bg-[#FAF5F5]">
                <TableCell>
                  <div className="font-medium text-gray-900">{e.employeeName}</div>
                  <div className="text-xs text-gray-400">{e.employeeCode}</div>
                </TableCell>
                <TableCell className="text-gray-600">{e.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">{e.present}</TableCell>
                <TableCell className="text-right tabular-nums text-red-500">{e.late}</TableCell>
                <TableCell className="text-right tabular-nums">{e.absent}</TableCell>
                <TableCell className="text-right tabular-nums">{e.totalHoursWorked.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{e.totalOvertimeHours.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{e.totalLateMinutes}</TableCell>
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <StatCard label="Runs" value={data?.totals.runCount ?? 0} />
        <StatCard label="Payslips" value={data?.totals.payslipCount ?? 0} />
        <StatCard label="Total Gross" value={formatCurrency(data?.totals.totalGross ?? 0)} />
        <StatCard label="Total Deductions" value={formatCurrency(data?.totals.totalDeductions ?? 0)} tone="destructive" />
        <StatCard label="Total Net Pay" value={formatCurrency(data?.totals.totalNet ?? 0)} accent />
      </div>

      <SectionDivider title="By Branch" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50/60">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branch</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Runs</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Payslips</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Gross</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Deductions</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Net Pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            <StateRow loading={loading} error={error} empty={empty} colSpan={6} fallback="Failed to load payroll report" />
            {data?.byBranch.map((b) => (
              <TableRow key={b.branchId} className="hover:bg-[#FAF5F5]">
                <TableCell className="font-medium" style={{ color: BRAND }}>{b.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">{b.runCount}</TableCell>
                <TableCell className="text-right tabular-nums">{b.payslipCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(b.totalGross)}</TableCell>
                <TableCell className="text-right tabular-nums text-red-500">{formatCurrency(b.totalDeductions)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(b.totalNet)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SectionDivider title="Runs" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50/60">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Period</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branch</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Payslips</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Gross</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Net Pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            <StateRow loading={loading} error={error} empty={empty} colSpan={6} fallback="Failed to load payroll report" />
            {data?.runs.map((r) => (
              <TableRow key={r.runId} className="hover:bg-[#FAF5F5]">
                <TableCell className="whitespace-nowrap tabular-nums text-gray-600">
                  {r.periodStart} → {r.periodEnd}
                </TableCell>
                <TableCell className="font-medium">{r.branchName}</TableCell>
                <TableCell className="text-gray-500 text-xs">{r.status}</TableCell>
                <TableCell className="text-right tabular-nums">{r.payslipCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(r.totalGross)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(r.totalNet)}</TableCell>
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <StatCard label="Active" value={data?.totals.active ?? 0} accent />
        <StatCard label="Inactive" value={data?.totals.inactive ?? 0} />
        <StatCard label="On Leave" value={data?.totals.onLeave ?? 0} />
        <StatCard label="Terminated" value={data?.totals.terminated ?? 0} tone="destructive" />
        <StatCard label="Total" value={data?.totals.total ?? 0} />
      </div>

      <SectionDivider title="By Branch" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50/60">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branch</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Active</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Inactive</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">On Leave</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Terminated</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            <StateRow loading={loading} error={error} empty={empty} colSpan={6} fallback="Failed to load headcount" />
            {data?.byBranch.map((b) => (
              <TableRow key={b.branchId} className="hover:bg-[#FAF5F5]">
                <TableCell className="font-medium" style={{ color: BRAND }}>{b.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">{b.active}</TableCell>
                <TableCell className="text-right tabular-nums">{b.inactive}</TableCell>
                <TableCell className="text-right tabular-nums">{b.onLeave}</TableCell>
                <TableCell className="text-right tabular-nums text-red-500">{b.terminated}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{b.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SectionDivider title="By Position" />
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-gray-50/60">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Position</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            <StateRow loading={loading} error={error} empty={empty} colSpan={2} fallback="Failed to load headcount" />
            {data?.byPosition.map((p) => (
              <TableRow key={p.position} className="hover:bg-[#FAF5F5]">
                <TableCell className="font-medium text-gray-700">{p.position}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{p.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
