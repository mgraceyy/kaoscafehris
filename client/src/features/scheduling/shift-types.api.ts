import api from "@/lib/api";

export interface ShiftType {
  id: string;
  branchId: string;
  name: string;
  startTime: string; // "HH:MM" format
  endTime: string;   // "HH:MM" format
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftTypeInput {
  branchId: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface UpdateShiftTypeInput {
  name?: string;
  startTime?: string;
  endTime?: string;
}

export async function listShiftTypes(branchId: string): Promise<ShiftType[]> {
  const { data } = await api.get<{ data: ShiftType[] }>("/scheduling/shift-types", {
    params: { branchId },
  });
  return data.data;
}

export async function createShiftType(input: CreateShiftTypeInput): Promise<ShiftType> {
  const { data } = await api.post<{ data: ShiftType }>("/scheduling/shift-types", input);
  return data.data;
}

export async function getShiftType(id: string): Promise<ShiftType> {
  const { data } = await api.get<{ data: ShiftType }>(`/scheduling/shift-types/${id}`);
  return data.data;
}

export async function updateShiftType(
  id: string,
  input: UpdateShiftTypeInput
): Promise<ShiftType> {
  const { data } = await api.put<{ data: ShiftType }>(
    `/scheduling/shift-types/${id}`,
    input
  );
  return data.data;
}

export async function deleteShiftType(id: string): Promise<void> {
  await api.delete(`/scheduling/shift-types/${id}`);
}
