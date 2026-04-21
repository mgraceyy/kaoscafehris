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
  PartyPopper,
  Receipt,
  ScrollText,
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
}

const NAV: NavItem[] = [
  // ── Admin & Manager ──────────────────────────────────────────────────────
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["ADMIN"] },
  { to: "/branches", label: "Branches", icon: Building2, roles: ["ADMIN"] },
  { to: "/scheduling", label: "Schedule", icon: CalendarClock, roles: ["ADMIN", "MANAGER"] },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["ADMIN", "MANAGER"] },
  { to: "/leave", label: "Leave Management", icon: CalendarDays, roles: ["ADMIN", "MANAGER"] },
  { to: "/overtime", label: "Overtime", icon: Clock, roles: ["ADMIN", "MANAGER"] },
  { to: "/holidays", label: "Holiday Management", icon: PartyPopper, roles: ["ADMIN"] },
  { to: "/payroll", label: "Payroll", icon: Wallet, roles: ["ADMIN"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  // ── Manager personal ─────────────────────────────────────────────────────
  { to: "/my-schedule", label: "My Schedule", icon: CalendarRange, roles: ["MANAGER"] },
  { to: "/my-attendance", label: "My Attendance", icon: ClipboardList, roles: ["MANAGER"] },
  { to: "/my-payslips", label: "My Payslips", icon: Receipt, roles: ["MANAGER"] },
  { to: "/profile", label: "My Profile", icon: User, roles: ["MANAGER"] },
];

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

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Top header ─────────────────────────────────────── */}
      <header
        className="z-30 flex h-16 shrink-0 items-center justify-between px-6"
        style={{ backgroundColor: BRAND }}
      >
        {/* Logo */}
        <img
          src="/kaos-logo.svg"
          alt="KAOS"
          className="h-10 w-auto brightness-0 invert"
        />

        {/* User dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full px-2 py-1 text-white transition-colors hover:bg-white/10"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" }}
            >
              {userInitials}
            </span>
            <span className="hidden text-sm font-medium sm:block">{displayName}</span>
            <ChevronDown className="h-4 w-4 opacity-80" />
          </button>

          {dropOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border bg-white py-1 shadow-lg">
                <div className="border-b px-4 py-2">
                  <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted/30"
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

      {/* ── Below header: sidebar + content ────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto bg-white shadow-sm md:block">
          <nav className="space-y-0.5 p-3 pt-4">
            {visible.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive ? "" : "text-[#666] hover:bg-[#F7EBEB]/60 hover:text-primary"
                    )}
                    style={isActive ? { backgroundColor: "#FAF0F0", color: BRAND } : {}}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F7EBEB]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
