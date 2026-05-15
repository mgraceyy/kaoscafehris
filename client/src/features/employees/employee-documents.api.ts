import api from "@/lib/api";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  name: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export async function listEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  const { data } = await api.get<{ data: EmployeeDocument[] }>(`/employees/${employeeId}/documents`);
  return data.data;
}

export async function uploadEmployeeDocument(
  employeeId: string,
  name: string,
  file: File
): Promise<EmployeeDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name);
  const { data } = await api.post<{ data: EmployeeDocument }>(
    `/employees/${employeeId}/documents`,
    form
  );
  return data.data;
}

export async function deleteEmployeeDocument(
  employeeId: string,
  docId: string
): Promise<void> {
  await api.delete(`/employees/${employeeId}/documents/${docId}`);
}

export function getDocumentDownloadUrl(employeeId: string, docId: string): string {
  return `/api/employees/${employeeId}/documents/${docId}/download`;
}

export function getDocumentPreviewUrl(employeeId: string, docId: string): string {
  return `/api/employees/${employeeId}/documents/${docId}/preview`;
}
