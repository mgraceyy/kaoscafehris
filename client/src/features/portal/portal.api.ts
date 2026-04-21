import api from "@/lib/api";

export interface PortalBranch {
  id: string;
  name: string;
  city?: string;
}

export interface PortalEmployee {
  id: string;
  employeeId: string;
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
  employmentStatus: "ACTIVE" | "INACTIVE" | "TERMINATED" | "ON_LEAVE";
  dateHired: string;
  basicSalary: string;
  sssNumber: string | null;
  philhealthNumber: string | null;
  pagibigNumber: string | null;
  tinNumber: string | null;
  branch: PortalBranch;
}

export interface PortalProfile {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  employee: PortalEmployee | null;
}

export interface UpdateProfileInput {
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface PortalShift {
  assignmentId: string;
  shiftId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  branch: PortalBranch;
}

export interface PortalAttendance {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY";
  hoursWorked: string | null;
  overtimeHours: string | null;
  lateMinutes: number | null;
  undertimeMinutes: number | null;
  remarks: string | null;
  branch: PortalBranch;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export async function getProfile(): Promise<PortalProfile> {
  const { data } = await api.get<{ data: PortalProfile }>("/portal/profile");
  return data.data;
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<PortalProfile> {
  const { data } = await api.put<{ data: PortalProfile }>(
    "/portal/profile",
    input
  );
  return data.data;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.put("/portal/password", input);
}

export async function uploadProfilePhoto(file: File): Promise<PortalProfile> {
  const form = new FormData();
  form.append("photo", file);
  const { data } = await api.post<{ data: PortalProfile }>("/portal/profile/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function getMySchedule(
  range: DateRange = {}
): Promise<PortalShift[]> {
  const params: Record<string, string> = {};
  if (range.startDate) params.startDate = range.startDate;
  if (range.endDate) params.endDate = range.endDate;
  const { data } = await api.get<{ data: PortalShift[] }>("/portal/schedule", {
    params,
  });
  return data.data;
}

export async function getMyAttendance(
  range: DateRange = {}
): Promise<PortalAttendance[]> {
  const params: Record<string, string> = {};
  if (range.startDate) params.startDate = range.startDate;
  if (range.endDate) params.endDate = range.endDate;
  const { data } = await api.get<{ data: PortalAttendance[] }>(
    "/portal/attendance",
    { params }
  );
  return data.data;
}

export async function getMyPayslipDetail(id: string) {
  const { data } = await api.get<{ data: import("@/features/payroll/payroll.api").PayslipDetail }>(
    `/payroll/my-payslips/${id}`
  );
  return data.data;
}

/** Format HH:MM from a @db.Time ISO (date portion is always 1970-01-01). */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Format an ISO datetime as HH:MM in local time. */
export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
