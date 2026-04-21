import api from "@/lib/api";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; email: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE" } | null;
}

export interface AuditLogListResult {
  items: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditLogQuery {
  userId?: string;
  action?: AuditAction;
  tableName?: string;
  recordId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(
  query: AuditLogQuery = {}
): Promise<AuditLogListResult> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params[k] = v as string | number;
  }
  const { data } = await api.get<{ data: AuditLogListResult }>("/audit-logs", {
    params,
  });
  return data.data;
}

export async function getAuditLog(id: string): Promise<AuditLog> {
  const { data } = await api.get<{ data: AuditLog }>(`/audit-logs/${id}`);
  return data.data;
}

export async function getAuditLogTables(): Promise<string[]> {
  const { data } = await api.get<{ data: string[] }>("/audit-logs/tables");
  return data.data;
}
