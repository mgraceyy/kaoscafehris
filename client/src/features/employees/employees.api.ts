import api from "@/lib/api";
import type { Role } from "@/features/auth/auth.api";

export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "TERMINATED" | "ON_LEAVE";

export interface EmployeeUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
}

export interface EmployeeBranch {
  id: string;
  name: string;
  city: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  userId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  civilStatus: string | null;
  nationality: string | null;
  profilePhoto: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  position: string;
  department: string | null;
  employmentStatus: EmploymentStatus;
  dateHired: string;
  dateTerminated: string | null;
  basicSalary: string; // Prisma Decimal is serialized as string
  sssNumber: string | null;
  philhealthNumber: string | null;
  pagibigNumber: string | null;
  tinNumber: string | null;
  defaultShiftTypeId: string | null;
  createdAt: string;
  updatedAt: string;
  user: EmployeeUser;
  branch: EmployeeBranch;
}

export interface EmployeeCreateInput {
  email: string;
  password: string;
  role: Role;
  employeeId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  position: string;
  department?: string;
  employmentStatus?: EmploymentStatus;
  dateHired: string; // ISO date
  basicSalary: number;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  sssNumber?: string;
  philhealthNumber?: string;
  pagibigNumber?: string;
  tinNumber?: string;
}

export type EmployeeUpdateInput = Partial<EmployeeCreateInput> & { isActive?: boolean; defaultShiftTypeId?: string | null };

export interface ListEmployeesParams {
  search?: string;
  branchId?: string;
  status?: EmploymentStatus;
  role?: Role;
}

export async function listEmployees(params: ListEmployeesParams = {}): Promise<Employee[]> {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  if (params.branchId) query.branchId = params.branchId;
  if (params.status) query.status = params.status;
  if (params.role) query.role = params.role;
  const { data } = await api.get<{ data: Employee[] }>("/employees", { params: query });
  return data.data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await api.get<{ data: Employee }>(`/employees/${id}`);
  return data.data;
}

export async function createEmployee(input: EmployeeCreateInput): Promise<Employee> {
  const { data } = await api.post<{ data: Employee }>("/employees", input);
  return data.data;
}

export async function updateEmployee(
  id: string,
  input: EmployeeUpdateInput
): Promise<Employee> {
  const { data } = await api.put<{ data: Employee }>(`/employees/${id}`, input);
  return data.data;
}

export async function deactivateEmployee(id: string): Promise<Employee> {
  const { data } = await api.delete<{ data: Employee }>(`/employees/${id}`);
  return data.data;
}

export interface ImportResult {
  created: number;
  skipped: number;
  failed: Array<{ row: number; reason: string }>;
}

export async function importEmployeesCsv(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ data: ImportResult }>("/employees/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export function getImportTemplateUrl(): string {
  return "/api/employees/import/template";
}
