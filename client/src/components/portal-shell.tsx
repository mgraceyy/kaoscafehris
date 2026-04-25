import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, Clock, FileText, Home, Leaf, Timer, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/portal", label: "Home", icon: Home, end: true },
  { to: "/portal/schedule", label: "Schedule", icon: CalendarDays, end: false },
  { to: "/portal/attendance", label: "Attendance", icon: Clock, end: false },
  { to: "/portal/leave", label: "Leave", icon: Leaf, end: false },
  { to: "/portal/overtime", label: "Overtime", icon: Timer, end: false },
  { to: "/portal/payslips", label: "Payslips", icon: FileText, end: false },
  { to: "/portal/profile", label: "Profile", icon: User, end: false },
];

export default function PortalShell() {
  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#FAF0F0" }}>
      <main className="pb-20 min-h-screen">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex h-16 items-stretch">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="flex-1">
              {({ isActive }) => (
                <div
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 transition-colors",
                    isActive ? "text-[#8C1515]" : "text-gray-400"
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" />
                  <span className="text-[9px] font-medium leading-none">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
