import api from "@/lib/api";

export interface Deduction {
  id: string;
  name: string;
  amount: number;
  type?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionInput {
  name: string;
  amount: number;
  type?: string | null;
}

export async function listDeductions(): Promise<Deduction[]> {
  const { data } = await api.get<{ data: Deduction[] }>("/deductions");
  return data.data;
}

export async function createDeduction(input: DeductionInput): Promise<Deduction> {
  const { data } = await api.post<{ data: Deduction }>("/deductions", input);
  return data.data;
}

export async function updateDeduction(id: string, input: Partial<DeductionInput>): Promise<Deduction> {
  const { data } = await api.patch<{ data: Deduction }>(`/deductions/${id}`, input);
  return data.data;
}

export async function deleteDeduction(id: string): Promise<void> {
  await api.delete(`/deductions/${id}`);
}
