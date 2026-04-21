import api from "@/lib/api";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface EmployeeSummary {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  branchId: string;
  profilePhoto: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  employee: EmployeeSummary | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function loginRequest(employeeId: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { employeeId, password });
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout");
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>("/auth/me");
  return data.user;
}
