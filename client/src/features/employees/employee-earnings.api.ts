import api from "@/lib/api";

export type ProfileEarningType = "BONUS" | "ALLOWANCE" | "OTHER";

export const PROFILE_EARNING_TYPES: { value: ProfileEarningType; label: string }[] = [
  { value: "ALLOWANCE", label: "Allowance" },
  { value: "BONUS", label: "Bonus" },
  { value: "OTHER", label: "Other" },
];

export interface EmployeeEarning {
  id: string;
  employeeId: string;
  type: ProfileEarningType;
  label: string;
  amount: string; // Prisma Decimal → string
  createdAt: string;
  updatedAt: string;
}

export interface AddEmployeeEarningInput {
  type: ProfileEarningType;
  label: string;
  amount: number;
}

export async function listEmployeeEarnings(employeeId: string): Promise<EmployeeEarning[]> {
  const { data } = await api.get<{ data: EmployeeEarning[] }>(`/employees/${employeeId}/earnings`);
  return data.data;
}

export async function addEmployeeEarning(
  employeeId: string,
  input: AddEmployeeEarningInput
): Promise<EmployeeEarning> {
  const { data } = await api.post<{ data: EmployeeEarning }>(
    `/employees/${employeeId}/earnings`,
    input
  );
  return data.data;
}

export async function removeEmployeeEarning(employeeId: string, eeId: string): Promise<void> {
  await api.delete(`/employees/${employeeId}/earnings/${eeId}`);
}
