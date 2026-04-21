import api from "@/lib/api";

// --- Shared ---------------------------------------------------------------

export interface DateRange {
  from: string;
  to: string;
}

export interface ReportParams {
  branchId?: string;
  periodStart?: string;
  periodEnd?: string;
}

function toQuery(params: ReportParams): Record<string, string> {
  const q: Record<string, string> = {};
  if (params.branchId) q.branchId = params.branchId;
  if (params.periodStart) q.periodStart = params.periodStart;
  if (params.periodEnd) q.periodEnd = params.periodEnd;
  return q;
}

// --- Attendance -----------------------------------------------------------

export interface AttendanceBranchRow {
  branchId: string;
  branchName: string;
  totalRecords: number;
  present: number;
  late: number;
  absent: number;
  halfDay: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
}

export interface AttendanceEmployeeRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  present: number;
  late: number;
  absent: number;
  halfDay: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
}

export interface AttendanceReport {
  range: DateRange;
  totals: {
    totalRecords: number;
    present: number;
    late: number;
    absent: number;
    halfDay: number;
    totalHoursWorked: number;
    totalOvertimeHours: number;
    totalLateMinutes: number;
  };
  byBranch: AttendanceBranchRow[];
  byEmployee: AttendanceEmployeeRow[];
}

export async function getAttendanceReport(
  params: ReportParams = {}
): Promise<AttendanceReport> {
  const { data } = await api.get<{ data: AttendanceReport }>(
    "/reports/attendance",
    { params: toQuery(params) }
  );
  return data.data;
}

// --- Payroll --------------------------------------------------------------

export interface PayrollBranchRow {
  branchId: string;
  branchName: string;
  runCount: number;
  payslipCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

export interface PayrollRunRow {
  runId: string;
  branchId: string;
  branchName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  payslipCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

export interface PayrollReport {
  range: DateRange;
  totals: {
    runCount: number;
    payslipCount: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
  };
  byBranch: PayrollBranchRow[];
  runs: PayrollRunRow[];
}

export async function getPayrollReport(
  params: ReportParams = {}
): Promise<PayrollReport> {
  const { data } = await api.get<{ data: PayrollReport }>("/reports/payroll", {
    params: toQuery(params),
  });
  return data.data;
}

// --- Headcount ------------------------------------------------------------

export interface HeadcountBranchRow {
  branchId: string;
  branchName: string;
  active: number;
  inactive: number;
  onLeave: number;
  terminated: number;
  total: number;
}

export interface HeadcountPositionRow {
  position: string;
  count: number;
}

export interface HeadcountReport {
  totals: {
    active: number;
    inactive: number;
    onLeave: number;
    terminated: number;
    total: number;
  };
  byBranch: HeadcountBranchRow[];
  byPosition: HeadcountPositionRow[];
}

export async function getHeadcountReport(
  branchId?: string
): Promise<HeadcountReport> {
  const { data } = await api.get<{ data: HeadcountReport }>(
    "/reports/headcount",
    { params: branchId ? { branchId } : {} }
  );
  return data.data;
}

// --- Exports --------------------------------------------------------------

export type ReportType = "attendance" | "payroll" | "headcount";
export type ReportFormat = "pdf" | "xlsx";

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function downloadReport(
  type: ReportType,
  format: ReportFormat,
  params: ReportParams,
  filename: string
): Promise<void> {
  const query: Record<string, string> = { format, ...toQuery(params) };
  const res = await api.get(`/reports/export/${type}`, {
    params: query,
    responseType: "blob",
  });
  triggerDownload(res.data as Blob, filename);
}

// --- Formatters -----------------------------------------------------------

export function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}
