import api from "@/lib/api";

export type GovTableType = "SSS" | "PHILHEALTH" | "PAGIBIG" | "BIR";

export interface Setting {
  key: string;
  value: unknown;
  group: string | null;
  updatedAt: string;
}

export interface GovTable {
  id: string;
  type: GovTableType;
  rangeFrom: number;
  rangeTo: number;
  employeeShare: number;
  employerShare: number;
  effectiveDate: string;
}

export interface BulkUpdateItem {
  key: string;
  value: unknown;
  group?: string;
}

export interface UpsertGovTableInput {
  id?: string;
  type: GovTableType;
  rangeFrom: number;
  rangeTo: number;
  employeeShare: number;
  employerShare: number;
  effectiveDate: string;
}

export async function listSettings(group?: string): Promise<Setting[]> {
  const { data } = await api.get<{ data: Setting[] }>("/settings", {
    params: group ? { group } : undefined,
  });
  return data.data;
}

export async function bulkUpdateSettings(
  settings: BulkUpdateItem[]
): Promise<Setting[]> {
  const { data } = await api.put<{ data: Setting[] }>("/settings", { settings });
  return data.data;
}

export async function listGovTables(type?: GovTableType): Promise<GovTable[]> {
  const { data } = await api.get<{ data: GovTable[] }>(
    "/settings/government-tables",
    { params: type ? { type } : undefined }
  );
  return data.data;
}

export async function upsertGovTable(
  input: UpsertGovTableInput
): Promise<GovTable> {
  const { data } = await api.post<{ data: GovTable }>(
    "/settings/government-tables",
    input
  );
  return data.data;
}

export async function deleteGovTable(id: string): Promise<void> {
  await api.delete(`/settings/government-tables/${id}`);
}
