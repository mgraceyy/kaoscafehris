import api from "@/lib/api";

export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  deductionId: string;
  amount: string | null;       // per-payroll override; null = use Deduction.amount
  totalBalance: string | null; // null = recurring
  paidAmount: string;
  createdAt: string;
  updatedAt: string;
  deduction: {
    id: string;
    name: string;
    type: string | null;
    amount: string;
  };
}

export interface AddEmployeeDeductionInput {
  deductionId: string;
  amount?: number | null;
  totalBalance?: number | null;
}

export interface UpdateEmployeeDeductionInput {
  amount?: number | null;
  totalBalance?: number | null;
  paidAmount?: number;
}

export async function listEmployeeDeductions(employeeId: string): Promise<EmployeeDeduction[]> {
  const { data } = await api.get<{ data: EmployeeDeduction[] }>(`/employees/${employeeId}/deductions`);
  return data.data;
}

export async function addEmployeeDeduction(
  employeeId: string,
  input: AddEmployeeDeductionInput
): Promise<EmployeeDeduction> {
  const { data } = await api.post<{ data: EmployeeDeduction }>(
    `/employees/${employeeId}/deductions`,
    input
  );
  return data.data;
}

export async function updateEmployeeDeduction(
  employeeId: string,
  edId: string,
  input: UpdateEmployeeDeductionInput
): Promise<EmployeeDeduction> {
  const { data } = await api.patch<{ data: EmployeeDeduction }>(
    `/employees/${employeeId}/deductions/${edId}`,
    input
  );
  return data.data;
}

export async function removeEmployeeDeduction(
  employeeId: string,
  edId: string
): Promise<void> {
  await api.delete(`/employees/${employeeId}/deductions/${edId}`);
}
