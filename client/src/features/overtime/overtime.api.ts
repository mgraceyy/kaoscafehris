import api from "@/lib/api";

export type OvertimeStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  shiftId: string | null;
  date: string;
  reason: string;
  status: OvertimeStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    position: string;
  };
}

export interface ListOvertimeFilters {
  employeeId?: string;
  status?: OvertimeStatus | "";
  startDate?: string;
  endDate?: string;
}

export async function listOvertimeRequests(filters: ListOvertimeFilters): Promise<OvertimeRequest[]> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined)
  );
  const { data } = await api.get<{ data: OvertimeRequest[] }>("/overtime", { params });
  return data.data;
}

export async function createOvertimeRequest(body: {
  date: string;
  reason: string;
  shiftId?: string;
}): Promise<OvertimeRequest> {
  const { data } = await api.post<{ data: OvertimeRequest }>("/overtime", body);
  return data.data;
}

export async function reviewOvertimeRequest(
  id: string,
  body: { status: "APPROVED" | "REJECTED"; reviewNotes?: string }
): Promise<OvertimeRequest> {
  const { data } = await api.patch<{ data: OvertimeRequest }>(`/overtime/${id}/review`, body);
  return data.data;
}

export async function setShiftOvertimeApproval(
  shiftId: string,
  employeeId: string,
  overtimeApproved: boolean
): Promise<void> {
  await api.patch(`/overtime/shift/${shiftId}/employee/${employeeId}`, { overtimeApproved });
}
