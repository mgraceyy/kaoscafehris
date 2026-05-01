import api from "@/lib/api";

export type LeaveType =
  | "VACATION"
  | "SICK"
  | "EMERGENCY"
  | "MATERNITY"
  | "PATERNITY"
  | "UNPAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  branchId: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: string;
  reason: string | null;
  status: LeaveStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  employee: LeaveEmployee;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  year: number;
  totalDays: string;
  usedDays: string;
  remainingDays: string;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
}

export interface ReviewLeaveInput {
  status: "APPROVED" | "REJECTED";
  reviewNotes?: string;
}

export interface UpsertLeaveBalanceInput {
  employeeId: string;
  leaveType: LeaveType;
  year: number;
  totalDays: number;
}

export interface UpsertLeaveBalanceAllInput {
  leaveType: LeaveType;
  year: number;
  totalDays: number;
}

export interface ListLeaveParams {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
}

export interface ListLeaveBalancesParams {
  employeeId?: string;
  year?: number;
}

export async function listRequests(
  params: ListLeaveParams = {}
): Promise<LeaveRequest[]> {
  const query: Record<string, string> = {};
  if (params.employeeId) query.employeeId = params.employeeId;
  if (params.status) query.status = params.status;
  if (params.leaveType) query.leaveType = params.leaveType;
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;
  const { data } = await api.get<{ data: LeaveRequest[] }>("/leave/requests", {
    params: query,
  });
  return data.data;
}

export async function createRequest(
  input: CreateLeaveRequestInput
): Promise<LeaveRequest> {
  const { data } = await api.post<{ data: LeaveRequest }>(
    "/leave/requests",
    input
  );
  return data.data;
}

export async function reviewRequest(
  id: string,
  input: ReviewLeaveInput
): Promise<LeaveRequest> {
  const { data } = await api.patch<{ data: LeaveRequest }>(
    `/leave/requests/${id}/review`,
    input
  );
  return data.data;
}

export async function revertRequest(id: string): Promise<LeaveRequest> {
  const { data } = await api.patch<{ data: LeaveRequest }>(
    `/leave/requests/${id}/revert`
  );
  return data.data;
}

export async function cancelRequest(id: string): Promise<LeaveRequest> {
  const { data } = await api.patch<{ data: LeaveRequest }>(
    `/leave/requests/${id}/cancel`
  );
  return data.data;
}

export async function listBalances(
  params: ListLeaveBalancesParams = {}
): Promise<LeaveBalance[]> {
  const query: Record<string, string> = {};
  if (params.employeeId) query.employeeId = params.employeeId;
  if (params.year) query.year = String(params.year);
  const { data } = await api.get<{ data: LeaveBalance[] }>("/leave/balances", {
    params: query,
  });
  return data.data;
}

export async function upsertBalance(
  input: UpsertLeaveBalanceInput
): Promise<LeaveBalance> {
  const { data } = await api.put<{ data: LeaveBalance }>(
    "/leave/balances",
    input
  );
  return data.data;
}

export async function upsertBalanceForAllEmployees(
  input: UpsertLeaveBalanceAllInput
): Promise<{ message: string; count: number }> {
  const { data } = await api.post<{ data: { message: string; count: number } }>(
    "/leave/balances/apply-all",
    input
  );
  return data.data;
}
