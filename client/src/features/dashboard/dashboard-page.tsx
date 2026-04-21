import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Users } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/auth.store";
import { listBranches } from "@/features/branches/branches.api";
import { listEmployees } from "@/features/employees/employees.api";
import { listAttendance } from "@/features/attendance/attendance.api";

const BRAND = "#8C1515";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StatCard({
  label,
  value,
  iconBg,
  icon,
}: {
  label: string;
  value: string | number;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const isAdminOrManager = isAdmin || user?.role === "MANAGER";
  const [branchFilter, setBranchFilter] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches", {}],
    queryFn: () => listBranches(),
    enabled: isAdmin,
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", {}],
    queryFn: () => listEmployees(),
    enabled: isAdmin,
  });

  const todayAttendanceQuery = useQuery({
    queryKey: ["attendance", { date: todayIso() }],
    queryFn: () => listAttendance({ date: todayIso() }),
    enabled: isAdminOrManager,
  });


  const totalEmployees = employeesQuery.data?.length ?? 0;
  const presentToday =
    todayAttendanceQuery.data?.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length ?? 0;
  const lateToday =
    todayAttendanceQuery.data?.filter((a) => a.status === "LATE").length ?? 0;
  const incomplete =
    todayAttendanceQuery.data?.filter((a) => !a.clockOut).length ?? 0;

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email?.split("@")[0] ?? "User";

  // Per-branch attendance breakdown
  const branches = branchesQuery.data ?? [];
  const attendanceData = todayAttendanceQuery.data ?? [];

  const branchStats = branches.map((b) => {
    const branchAtt = attendanceData.filter((a) => a.branch?.id === b.id);
    const branchEmps =
      employeesQuery.data?.filter((e) => e.branch?.id === b.id).length ?? 0;
    const pct = branchEmps > 0 ? Math.round((branchAtt.length / branchEmps) * 100) : 0;
    return { name: b.name, pct, count: branchAtt.length, total: branchEmps };
  });

  const recentActivity = (todayAttendanceQuery.data ?? [])
    .filter((a) => a.clockIn)
    .sort((a, b) => (b.clockIn > a.clockIn ? 1 : -1))
    .slice(0, 5);

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Good {getGreeting()}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Welcome to KAOS HRIS.</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold text-gray-800">{displayName}</p>
              <p className="text-sm text-gray-500">{user?.role} · {user?.employee?.position}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Filters Card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Date Range</label>
            <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Branch</label>
            <Select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Employees"
            value={totalEmployees}
            iconBg="#EFF6FF"
            icon={<Users className="h-6 w-6 text-blue-500" />}
          />
          <StatCard
            label="Present Today"
            value={presentToday}
            iconBg="#F0FDF4"
            icon={
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Late Today"
            value={lateToday}
            iconBg="#FFFBEB"
            icon={
              <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Incomplete Logs"
            value={incomplete}
            iconBg="#FFF1F2"
            icon={<AlertCircle className="h-6 w-6 text-red-500" />}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Attendance Trends */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Attendance Trends</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 7 days comparison of on-time vs late arrivals</p>
          </div>
          <AttendanceTrendChart />
        </div>

        {/* Late vs On-Time */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Today: Late vs On-Time</h2>
            <p className="text-xs text-gray-400 mt-0.5">Current day breakdown of employee punctuality</p>
          </div>
          <LateVsOntimeChart late={lateToday} onTime={presentToday - lateToday} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Branch Attendance Overview */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-800">Branch Attendance Overview</h2>
              <span className="text-xs text-gray-400">
                Today, {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <p className="text-xs text-gray-400">Attendance rate by branch (employees who clocked in)</p>
          </div>
          {branchStats.length === 0 ? (
            <p className="text-sm text-gray-400">No branch data available.</p>
          ) : (
            <div className="space-y-3">
              {branchStats.map((b) => (
                <div key={b.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{b.name}</span>
                    <span className="text-gray-400">{b.pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${b.pct}%`,
                        backgroundColor: b.pct >= 80 ? "#22C55E" : b.pct >= 50 ? "#EAB308" : BRAND,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest clock-ins from today</p>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No clock-ins today yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {a.employee.firstName} {a.employee.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.employee.position} · Clocked in
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-gray-400">
                    {a.clockIn
                      ? new Date(a.clockIn).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function AttendanceTrendChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Static placeholder data — replace with real data when endpoint exists
  const data = [85, 90, 78, 92, 88, 72, 65];
  const max = 100;
  const h = 100;
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox={`0 0 100 100`} className="w-full" style={{ height: 140 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity="0.15" />
            <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={BRAND}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polygon
          points={`${pts.join(" ")} 100,100 0,100`}
          fill="url(#grad)"
        />
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * w;
          const y = h - (v / max) * h;
          return (
            <circle key={i} cx={x} cy={y} r={1.5} fill={BRAND} />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        {days.map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}

function LateVsOntimeChart({ late, onTime }: { late: number; onTime: number }) {
  const total = late + onTime;
  const maxVal = Math.max(total, 1);
  const bars = [
    { label: "On-Time", value: onTime, color: "#22C55E" },
    { label: "Late", value: late, color: "#EAB308" },
  ];

  return (
    <div className="flex h-36 items-end gap-6 px-4">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-sm font-bold text-gray-700">{b.value}</span>
          <div className="w-full overflow-hidden rounded-t-lg bg-gray-100" style={{ height: 100 }}>
            <div
              className="w-full rounded-t-lg transition-all"
              style={{
                height: `${(b.value / maxVal) * 100}%`,
                backgroundColor: b.color,
                marginTop: `${100 - (b.value / maxVal) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-400">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
