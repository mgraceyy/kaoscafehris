import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CalendarDays, Clock, FileText, User } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth.store";
import { formatTime, getMyAttendance, getMySchedule, getProfile } from "./portal.api";

const BRAND = "#8C1515";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function fmtLocalTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(dateIso: string) {
  return DAY_SHORT[new Date(dateIso + "T00:00:00").getDay()];
}

const TILES = [
  { label: "View Schedule", desc: "Check your upcoming shifts", icon: CalendarDays, to: "/portal/schedule" },
  { label: "Attendance History", desc: "View your time logs", icon: Clock, to: "/portal/attendance" },
  { label: "Payslips", desc: "View your payslips", icon: FileText, to: "/portal/payslips" },
  { label: "Profile", desc: "Manage your information", icon: User, to: "/portal/profile" },
];

export default function PortalHomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const today = todayIso();

  const profileQuery = useQuery({ queryKey: ["portal-profile"], queryFn: getProfile });
  const scheduleQuery = useQuery({
    queryKey: ["portal-schedule", today, today],
    queryFn: () => getMySchedule({ startDate: today, endDate: today }),
  });
  const attendanceQuery = useQuery({
    queryKey: ["portal-attendance-today", today],
    queryFn: () => getMyAttendance({ startDate: today, endDate: today }),
  });

  const emp = profileQuery.data?.employee;
  const firstName = emp?.firstName ?? user?.email?.split("@")[0] ?? "there";
  const todayShift = scheduleQuery.data?.[0] ?? null;
  const todayAtt = attendanceQuery.data?.[0] ?? null;

  return (
    <div>
      {/* Maroon header */}
      <div
        className="rounded-b-[28px] px-6 pt-14 pb-8"
        style={{ background: `linear-gradient(135deg, #6B0F0F 0%, ${BRAND} 50%, #9E1A1A 100%)` }}
      >
        <div className="flex items-start justify-between">
          <div className="animate-fade-up">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Employee Portal</p>
            <h1 className="font-heading text-white text-[26px] leading-snug italic">
              Good {getGreeting()},{" "}
              <span className="not-italic font-normal">{firstName}</span>
            </h1>
          </div>
          <img
            src="/kaos-logo.svg"
            alt="KAOS"
            className="h-10 w-auto brightness-0 invert opacity-40 mt-1"
          />
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Today's Shift */}
        <div className="animate-fade-up stagger-2 bg-white rounded-2xl p-5 shadow-sm" style={{ borderLeft: `4px solid ${BRAND}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading text-lg text-gray-800">Today's Shift</span>
            {todayShift && (
              <span className="rounded-full bg-green-100 text-green-700 text-xs px-3 py-1 font-semibold">
                Ongoing
              </span>
            )}
          </div>

          {todayShift ? (
            <>
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {formatTime(todayShift.startTime)} – {formatTime(todayShift.endTime)}
                  </p>
                  <div className="flex gap-4 mt-0.5">
                    <span className="text-xs text-gray-400">{dayLabel(todayShift.date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 mt-2.5">
                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700">{todayShift.branch.name}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">No shift scheduled for today.</p>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {todayAtt?.clockIn
                ? `Last clock-in: Today at ${fmtLocalTime(todayAtt.clockIn)}`
                : "No clock-in recorded today"}
            </p>
          </div>
        </div>

        {/* Quick Access */}
        <div className="animate-fade-up stagger-3">
          <h2 className="font-heading text-lg text-gray-800 mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {TILES.map(({ label, desc, icon: Icon, to }, idx) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`bg-white rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.98] animate-fade-up stagger-${idx + 1}`}
                style={{ borderTop: `3px solid ${BRAND}` }}
              >
                <div
                  className="mb-3 inline-flex items-center justify-center rounded-xl p-2"
                  style={{ backgroundColor: "#FAF0F0" }}
                >
                  <Icon className="h-5 w-5" style={{ color: BRAND }} />
                </div>
                <p className="font-semibold text-gray-800 text-sm leading-snug">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                <div className="mt-3">
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
