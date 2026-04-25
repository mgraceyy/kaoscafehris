import { useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  MinusCircle,
  PartyPopper,
  Receipt,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth.store";
import { useLogout } from "@/features/auth/use-login";

const BRAND = "#8C1515";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<"ADMIN" | "MANAGER" | "EMPLOYEE">;
  group?: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER"], group: "overview" },
  { to: "/employees", label: "Employees", icon: Users, roles: ["ADMIN"], group: "manage" },
  { to: "/branches", label: "Branches", icon: Building2, roles: ["ADMIN"], group: "manage" },
  { to: "/scheduling", label: "Schedule", icon: CalendarClock, roles: ["ADMIN", "MANAGER"], group: "manage" },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["ADMIN", "MANAGER"], group: "manage" },
  { to: "/leave", label: "Leave Management", icon: CalendarDays, roles: ["ADMIN", "MANAGER"], group: "manage" },
  { to: "/overtime", label: "Overtime", icon: Clock, roles: ["ADMIN", "MANAGER"], group: "manage" },
  { to: "/holidays", label: "Holidays", icon: PartyPopper, roles: ["ADMIN"], group: "manage" },
  { to: "/deductions", label: "Deductions", icon: MinusCircle, roles: ["ADMIN"], group: "manage" },
  { to: "/payroll", label: "Payroll", icon: Wallet, roles: ["ADMIN"], group: "manage" },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "MANAGER"], group: "manage" },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"], group: "system" },
  { to: "/my-schedule", label: "My Schedule", icon: CalendarRange, roles: ["MANAGER"], group: "personal" },
  { to: "/my-attendance", label: "My Attendance", icon: ClipboardList, roles: ["MANAGER"], group: "personal" },
  { to: "/my-payslips", label: "My Payslips", icon: Receipt, roles: ["MANAGER"], group: "personal" },
  { to: "/profile", label: "My Profile", icon: User, roles: ["MANAGER"], group: "personal" },
];

const GROUP_LABELS: Record<string, string> = {
  overview: "Overview",
  manage: "Management",
  personal: "Personal",
  system: "System",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const visible = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : (user?.email?.split("@")[0] ?? "User");

  const userInitials = initials(displayName);

  // Group nav items
  const groups = visible.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? "other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const groupOrder = ["overview", "manage", "personal", "system", "other"];

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Top header ─────────────────────────────────── */}
      <header
        className="z-30 flex h-16 shrink-0 items-center justify-between px-6 shadow-sm"
        style={{
          background: `linear-gradient(135deg, #6B0F0F 0%, ${BRAND} 50%, #9E1A1A 100%)`,
        }}
      >
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <img
            src="/kaos-logo.svg"
            alt="KAOS"
            className="h-9 w-auto brightness-0 invert"
          />
          <div className="hidden border-l border-white/20 pl-3 sm:block">
            <p className="font-heading text-sm leading-none text-white/90 italic">
              Human Resources
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/60 mt-0.5">
              Information System
            </p>
          </div>
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full px-2 py-1.5 text-white transition-all hover:bg-white/10 active:bg-white/15"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-inner"
              style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)" }}
            >
              {userInitials}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-none">{displayName}</p>
              <p className="mt-0.5 text-[11px] text-white/60 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>

          {dropOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl animate-fade-in">
                <div className="bg-[#FAF0F0] px-4 py-3 border-b border-gray-100">
                  <p className="truncate text-sm font-semibold text-gray-800">{displayName}</p>
                  <p className="truncate text-xs text-gray-400 capitalize mt-0.5">{user?.role?.toLowerCase()}</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-700 transition-colors"
                  onClick={() => { setDropOpen(false); logout.mutate(); }}
                  disabled={logout.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Below header: sidebar + content ────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto bg-white shadow-sm md:flex"
          style={{ borderRight: "1px solid #F0E5E5" }}>

          {/* Nav groups */}
          <nav className="flex-1 px-3 py-4 space-y-5">
            {groupOrder.filter(g => groups[g]?.length).map((group) => (
              <div key={group}>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">
                  {GROUP_LABELS[group] ?? group}
                </p>
                <div className="space-y-0.5">
                  {groups[group].map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/"}
                    >
                      {({ isActive }) => (
                        <span
                          className={cn(
                            "nav-item-active flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                            isActive
                              ? "text-[#8C1515] bg-[#FAF0F0]"
                              : "text-gray-500 hover:bg-[#FAF0F0]/70 hover:text-[#8C1515]"
                          )}
                          style={isActive ? {} : { borderLeft: "3px solid transparent" }}
                        >
                          <Icon className={cn(
                            "h-[17px] w-[17px] shrink-0 transition-colors",
                            isActive ? "text-[#8C1515]" : "text-gray-400"
                          )} />
                          {label}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar footer — user info strip */}
          <div
            className="border-t px-4 py-3 flex items-center gap-3"
            style={{ borderColor: "#F0E5E5" }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: "#F3E4E4", color: BRAND }}
            >
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-700">{displayName}</p>
              <p className="truncate text-[10px] text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
