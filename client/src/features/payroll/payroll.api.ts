import api from "@/lib/api";

export type PayrollStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type PayslipStatus = "DRAFT" | "FINALIZED";
export type EarningType =
  | "OVERTIME"
  | "BONUS"
  | "ALLOWANCE"
  | "HOLIDAY_PAY"
  | "OTHER";
export type DeductionType =
  | "LATE"
  | "CASH_ADVANCE"
  | "SALARY_LOAN"
  | "SSS"
  | "PHILHEALTH"
  | "PAGIBIG"
  | "BIR_TAX"
  | "OTHER";

export interface PayrollBranch {
  id: string;
  name: string;
  city: string;
}

export interface PayrollRunSummary {
  id: string;
  branchId: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  branch: PayrollBranch;
  _count: { payslips: number };
}

export interface PayslipSummary {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicPay: string;
  overtimePay: string;
  bonuses: string;
  allowances: string;
  holidayPay: string;
  grossPay: string;
  sssContribution: string;
  philhealthContribution: string;
  pagibigContribution: string;
  withholdingTax: string;
  lateDeductions: string;
  cashAdvance: string;
  salaryLoan: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
  status: PayslipStatus;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position: string;
  };
}

export interface PayrollRunDetail extends Omit<PayrollRunSummary, "_count"> {
  payslips: PayslipSummary[];
}

export interface PayslipLineItem {
  id: string;
  payslipId: string;
  type: EarningType | DeductionType;
  label: string;
  amount: string;
}

export interface PayslipEarning extends PayslipLineItem {
  type: EarningType;
}

export interface PayslipDeduction extends PayslipLineItem {
  type: DeductionType;
}

export interface PayslipDetail extends PayslipSummary {
  employee: PayslipSummary["employee"] & {
    department: string | null;
    basicSalary: string;
    sssNumber: string | null;
    philhealthNumber: string | null;
    pagibigNumber: string | null;
    tinNumber: string | null;
    branch: PayrollBranch;
  };
  payrollRun: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: PayrollStatus;
    branch: PayrollBranch;
  };
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
}

export interface CreatePayrollRunInput {
  branchId: string;
  periodStart: string;
  periodEnd: string;
}

export interface PayslipEarningInput {
  type: EarningType;
  label: string;
  amount: number;
}

export interface PayslipDeductionInput {
  type: DeductionType;
  label: string;
  amount: number;
}

export interface AdjustPayslipInput {
  earnings: PayslipEarningInput[];
  deductions: PayslipDeductionInput[];
  basicPay?: number;
  remarks?: string;
}

export interface ListPayrollRunsParams {
  branchId?: string;
  status?: PayrollStatus;
  periodStart?: string;
  periodEnd?: string;
}

export async function listRuns(
  params: ListPayrollRunsParams = {}
): Promise<PayrollRunSummary[]> {
  const query: Record<string, string> = {};
  if (params.branchId) query.branchId = params.branchId;
  if (params.status) query.status = params.status;
  if (params.periodStart) query.periodStart = params.periodStart;
  if (params.periodEnd) query.periodEnd = params.periodEnd;
  const { data } = await api.get<{ data: PayrollRunSummary[] }>(
    "/payroll/runs",
    { params: query }
  );
  return data.data;
}

export async function getRun(id: string): Promise<PayrollRunDetail> {
  const { data } = await api.get<{ data: PayrollRunDetail }>(
    `/payroll/runs/${id}`
  );
  return data.data;
}

export async function createRun(
  input: CreatePayrollRunInput
): Promise<PayrollRunDetail> {
  const { data } = await api.post<{ data: PayrollRunDetail }>(
    "/payroll/runs",
    input
  );
  return data.data;
}

export async function processRun(id: string): Promise<PayrollRunDetail> {
  const { data } = await api.post<{ data: PayrollRunDetail }>(
    `/payroll/runs/${id}/process`
  );
  return data.data;
}

export async function completeRun(id: string): Promise<PayrollRunDetail> {
  const { data } = await api.patch<{ data: PayrollRunDetail }>(
    `/payroll/runs/${id}/complete`
  );
  return data.data;
}

export async function cancelRun(id: string): Promise<void> {
  await api.delete(`/payroll/runs/${id}`);
}

export async function getPayslip(id: string): Promise<PayslipDetail> {
  const { data } = await api.get<{ data: PayslipDetail }>(
    `/payroll/payslips/${id}`
  );
  return data.data;
}

export async function adjustPayslip(
  id: string,
  input: AdjustPayslipInput
): Promise<PayslipDetail> {
  const { data } = await api.put<{ data: PayslipDetail }>(
    `/payroll/payslips/${id}`,
    input
  );
  return data.data;
}

// --- My payslips (employee-facing) -----------------------------------------

export interface MyPayslipSummary {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicPay: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  status: PayslipStatus;
  createdAt: string;
  updatedAt: string;
  payrollRun: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: PayrollStatus;
    branch: { id: string; name: string };
  };
}

export async function listMyPayslips(): Promise<MyPayslipSummary[]> {
  const { data } = await api.get<{ data: MyPayslipSummary[] }>(
    "/payroll/my-payslips"
  );
  return data.data;
}

// --- File downloads --------------------------------------------------------

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the browser has time to start the download.
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function downloadPayslipPdf(
  payslipId: string,
  filename: string
): Promise<void> {
  const res = await api.get(`/payroll/payslips/${payslipId}/pdf`, {
    responseType: "blob",
  });
  triggerDownload(res.data as Blob, filename);
}

export async function downloadRunPdf(
  runId: string,
  filename: string
): Promise<void> {
  const res = await api.get(`/payroll/runs/${runId}/pdf`, {
    responseType: "blob",
  });
  triggerDownload(res.data as Blob, filename);
}

export async function downloadRunXlsx(
  runId: string,
  filename: string
): Promise<void> {
  const res = await api.get(`/payroll/runs/${runId}/xlsx`, {
    responseType: "blob",
  });
  triggerDownload(res.data as Blob, filename);
}

export function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}
