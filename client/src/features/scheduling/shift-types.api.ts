import api from "@/lib/api";

export interface ShiftTypeBranch {
  branchId: string;
  branch: { id: string; name: string };
}

export interface ShiftType {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  branches: ShiftTypeBranch[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftTypeInput {
  branchIds: string[];
  name: string;
  startTime: string;
  endTime: string;
}

export interface UpdateShiftTypeInput {
  branchIds?: string[];
  name?: string;
  startTime?: string;
  endTime?: string;
}

export async function listShiftTypes(branchId?: string): Promise<ShiftType[]> {
  const { data } = await api.get<{ data: ShiftType[] }>("/scheduling/shift-types", {
    params: branchId ? { branchId } : {},
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
