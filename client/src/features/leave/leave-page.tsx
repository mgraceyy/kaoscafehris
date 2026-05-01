import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Search, Settings } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { exportToCsv } from "@/lib/export";
import { useAuthStore } from "@/features/auth/auth.store";
import { listBranches } from "@/features/branches/branches.api";
import {
  listBalances,
  listRequests,
  revertRequest,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "./leave.api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import LeaveReviewDialog from "./leave-review-dialog";
import LeaveBalanceDialog from "./leave-balance-dialog";
import LeaveRequestDialog from "./leave-request-dialog";

const BRAND = "#8C1515";

const TYPE_LABEL: Record<LeaveType, string> = {
  VACATION: "Vacation Leave",
  SICK: "Sick Leave",
  EMERGENCY: "Emergency Leave",
  MATERNITY: "Maternity Leave",
  PATERNITY: "Paternity Leave",
  UNPAID: "Unpaid Leave",
};

const TYPE_COLOR: Record<LeaveType, string> = {
  VACATION: "#2563EB",
  SICK: "#6B7280",
  EMERGENCY: "#D97706",
  MATERNITY: "#7C3AED",
  PATERNITY: "#0891B2",
  UNPAID: "#374151",
};

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function Avatar({ first, last }: { first: string; last: string }) {
  const colors = ["#8C1515", "#2563EB", "#7C3AED", "#0891B2", "#D97706", "#16A34A"];
  const idx = (first.charCodeAt(0) + last.charCodeAt(0)) % colors.length;
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: colors[idx] }}
    >
      {getInitials(first, last)}
    </div>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map: Record<LeaveStatus, { bg: string; color: string; label: string }> = {
    PENDING:   { bg: "#FEF9C3", color: "#CA8A04", label: "Pending" },
    APPROVED:  { bg: "#DCFCE7", color: "#16A34A", label: "Approved" },
    REJECTED:  { bg: "#FEE2E2", color: "#DC2626", label: "Rejected" },
    CANCELLED: { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function StatCard({ label, value, color, stagger }: { label: string; value: number; color: string; stagger: number }) {
  return (
    <div className={`animate-fade-up stagger-${stagger} relative overflow-hidden rounded-xl bg-white p-5 shadow-sm card-hover`} style={{ borderLeft: `4px solid ${color}` }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <p className="font-heading text-4xl leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function BalanceCards({ balances }: { balances: LeaveBalance[] }) {
  if (!balances.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map((b) => {
        const total = Number(b.totalDays);
        const used = Number(b.usedDays);
        const remaining = Number(b.remainingDays);
        const pct = total > 0 ? Math.round((used / total) * 100) : 0;
        return (
          <div key={b.id} className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-800">{TYPE_LABEL[b.leaveType]}</span>
              <span className="text-gray-400">{b.year}</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-800 tabular-nums">{remaining}</span>
              <span className="mb-0.5 text-sm text-gray-400">/ {total} days</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: BRAND }} />
            </div>
            <p className="text-xs text-gray-400">{used} used</p>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeavePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";
  const canReview = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | LeaveType>("");
  const [statusFilter, setStatusFilter] = useState<"" | LeaveStatus>("");
  const [branchId, setBranchId] = useState("");
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [reviewInitialStatus, setReviewInitialStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [revertTarget, setRevertTarget] = useState<LeaveRequest | null>(null);

  const currentYear = new Date().getFullYear();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: !isEmployee,
  });

  const filters = useMemo(() => ({
    ...(isEmployee && user?.employee ? { employeeId: user.employee.id } : {}),
  }), [isEmployee, user]);

  const query = useQuery({
    queryKey: ["leave-requests", filters],
    queryFn: () => listRequests(filters),
  });

  const balancesQuery = useQuery({
    queryKey: ["leave-balances", { employeeId: user?.employee?.id, year: currentYear }],
    queryFn: () => listBalances({ employeeId: user!.employee!.id, year: currentYear }),
    enabled: isEmployee && !!user?.employee,
  });


  const revertMut = useMutation({
    mutationFn: (id: string) => revertRequest(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave-requests"] }); qc.invalidateQueries({ queryKey: ["leave-balances"] }); toast("Leave request reverted to pending", "success"); setRevertTarget(null); },
    onError: (err) => { toast(extractErrorMessage(err), "error"); setRevertTarget(null); },
  });

  const allData = query.data ?? [];

  const filtered = useMemo(() => {
    let data = allData;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) =>
        `${r.employee.firstName} ${r.employee.lastName} ${r.employee.employeeId}`.toLowerCase().includes(q)
      );
    }
    if (typeFilter) data = data.filter((r) => r.leaveType === typeFilter);
    if (statusFilter) data = data.filter((r) => r.status === statusFilter);
    if (branchId) data = data.filter((r) => r.employee.branchId === branchId);
    return data;
  }, [allData, search, typeFilter, statusFilter, branchId]);

  const stats = useMemo(() => ({
    pending: allData.filter((r) => r.status === "PENDING").length,
    approved: allData.filter((r) => r.status === "APPROVED").length,
    rejected: allData.filter((r) => r.status === "REJECTED").length,
    total: allData.length,
  }), [allData]);

  const selectedBranchName = branchId
    ? branchesQuery.data?.find((b) => b.id === branchId)?.name ?? "Selected Branch"
    : "All Branches";

  function handleExport() {
    const headers = ["Employee ID", "Name", "Position", "Leave Type", "From", "To", "Days", "Filed On", "Reason", "Status"];
    const rows = filtered.map((r) => [
      r.employee.employeeId,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.position,
      TYPE_LABEL[r.leaveType],
      r.startDate.slice(0, 10),
      r.endDate.slice(0, 10),
      String(Number(r.totalDays)),
      r.createdAt.slice(0, 10),
      r.reason ?? "",
      r.status,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    exportToCsv(`leave_requests_${stamp}.csv`, headers, rows);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            {isEmployee ? "My Leave" : "Leave Management"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">{monthLabel} · {selectedBranchName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
          {isAdmin && (
            <button
              onClick={() => setBalanceOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          {!isAdmin && (
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: BRAND }}
            >
              + File Request
            </button>
          )}
        </div>
      </div>

      {/* Balance cards for employee */}
      {isEmployee && balancesQuery.data && (
        <div className="mb-6">
          <BalanceCards balances={balancesQuery.data} />
        </div>
      )}

      {/* Stat cards — admin/manager only */}
      {!isEmployee && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Pending" value={stats.pending} color="#CA8A04" stagger={1} />
          <StatCard label="Approved" value={stats.approved} color="#16A34A" stagger={2} />
          <StatCard label="Rejected" value={stats.rejected} color="#DC2626" stagger={3} />
          <StatCard label="Total" value={stats.total} color={BRAND} stagger={4} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm animate-fade-up stagger-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isEmployee && (
          <select
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">All Branches</option>
            {branchesQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | LeaveType)}
        >
          <option value="">All Types</option>
          {(Object.keys(TYPE_LABEL) as LeaveType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | LeaveStatus)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="animate-fade-up stagger-5 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead style={{ background: "#FDFAFA" }}>
            <tr style={{ borderBottom: "1px solid #F5EDED" }}>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Employee</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Leave Type</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">From</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">To</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Days</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Filed On</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Reason</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Status</th>
              {canReview && <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#F5EDED" }}>
            {query.isLoading && (
              <tr>
                <td colSpan={canReview ? 9 : 8} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {!query.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={canReview ? 9 : 8} className="py-12 text-center text-sm text-gray-400">
                  No leave requests found.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const isPending = r.status === "PENDING";
              return (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => setReviewTarget(r)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar first={r.employee.firstName} last={r.employee.lastName} />
                      <div>
                        <p className="font-semibold text-gray-800 leading-tight">
                          {r.employee.firstName} {r.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{r.employee.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium" style={{ color: TYPE_COLOR[r.leaveType] }}>
                      {TYPE_LABEL[r.leaveType]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 tabular-nums">{formatDate(r.startDate)}</td>
                  <td className="px-5 py-4 text-gray-600 tabular-nums">{formatDate(r.endDate)}</td>
                  <td className="px-5 py-4 text-gray-600 tabular-nums">{Number(r.totalDays)}d</td>
                  <td className="px-5 py-4 text-gray-500 tabular-nums">{formatDate(r.createdAt)}</td>
                  <td className="px-5 py-4 text-gray-600 max-w-[160px] truncate">{r.reason || "—"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  {canReview && (
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      {isPending ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setReviewInitialStatus("APPROVED"); setReviewTarget(r); }}
                            className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setReviewInitialStatus("REJECTED"); setReviewTarget(r); }}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                            style={{ backgroundColor: BRAND }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (r.status === "APPROVED" || r.status === "REJECTED") ? (
                        <button
                          onClick={() => setRevertTarget(r)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          Revert
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {allData.length} requests</p>
          </div>
        )}
      </div>

      <LeaveReviewDialog
        open={!!reviewTarget}
        onOpenChange={(o) => !o && setReviewTarget(null)}
        request={reviewTarget}
        initialStatus={reviewInitialStatus}
      />
      <LeaveRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
      {isAdmin && <LeaveBalanceDialog open={balanceOpen} onOpenChange={setBalanceOpen} />}

      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(o) => !o && setRevertTarget(null)}
        title="Revert leave request?"
        description={
          revertTarget
            ? `This will set ${revertTarget.employee.firstName} ${revertTarget.employee.lastName}'s ${TYPE_LABEL[revertTarget.leaveType]} request back to Pending and restore ${revertTarget.totalDays} day(s) to their balance.`
            : ""
        }
        confirmLabel="Revert"
        onConfirm={() => revertTarget && revertMut.mutate(revertTarget.id)}
        loading={revertMut.isPending}
      />
    </div>
  );
}
