import api from "@/lib/api";

export type ShiftStatus = "DRAFT" | "PUBLISHED";

export interface ShiftAssignmentEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  employeeId: string;
  createdAt: string;
  employee: ShiftAssignmentEmployee;
}

export interface Shift {
  id: string;
  branchId: string;
  shiftTypeId?: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string };
  shiftType?: { id: string; name: string };
  assignments: ShiftAssignment[];
}

export interface ShiftCreateInput {
  branchId: string;
  shiftTypeId?: string;
  name: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status?: ShiftStatus;
  employeeIds?: string[];
}

export interface ShiftUpdateInput {
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: ShiftStatus;
}

export interface ListShiftsParams {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  status?: ShiftStatus;
}

function toClock(dt: string): string {
  const d = new Date(dt);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function toDate(dt: string): string {
  return dt.slice(0, 10);
}

export function formatShiftTime(dt: string): string {
  return toClock(dt);
}

export function formatShiftDate(dt: string): string {
  return toDate(dt);
}

export async function listShifts(params: ListShiftsParams = {}): Promise<Shift[]> {
  const query: Record<string, string> = {};
  if (params.branchId) query.branchId = params.branchId;
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;
  if (params.status) query.status = params.status;
  const { data } = await api.get<{ data: Shift[] }>("/scheduling/shifts", {
    params: query,
  });
  return data.data;
}

export async function getShift(id: string): Promise<Shift> {
  const { data } = await api.get<{ data: Shift }>(`/scheduling/shifts/${id}`);
  return data.data;
}

export async function createShift(input: ShiftCreateInput): Promise<Shift> {
  const { data } = await api.post<{ data: Shift }>("/scheduling/shifts", input);
  return data.data;
}

export async function updateShift(
  id: string,
  input: ShiftUpdateInput
): Promise<Shift> {
  const { data } = await api.put<{ data: Shift }>(
    `/scheduling/shifts/${id}`,
    input
  );
  return data.data;
}

export async function deleteShift(id: string): Promise<void> {
  await api.delete(`/scheduling/shifts/${id}`);
}

export async function assignEmployees(
  shiftId: string,
  employeeIds: string[]
): Promise<Shift> {
  const { data } = await api.post<{ data: Shift }>(
    `/scheduling/shifts/${shiftId}/assignments`,
    { employeeIds }
  );
  return data.data;
}

export async function unassignEmployee(
  shiftId: string,
  employeeId: string
): Promise<Shift> {
  const { data } = await api.delete<{ data: Shift }>(
    `/scheduling/shifts/${shiftId}/assignments/${employeeId}`
  );
  return data.data;
}

export async function publishShift(id: string): Promise<Shift> {
  const { data } = await api.patch<{ data: Shift }>(
    `/scheduling/shifts/${id}/publish`
  );
  return data.data;
}
