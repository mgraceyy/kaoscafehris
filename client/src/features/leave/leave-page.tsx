import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Settings, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { listBranches } from "@/features/branches/branches.api";
import {
  listBalances,
  listRequests,
  reviewRequest,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "./leave.api";
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

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map = {
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

// Detail panel shown on row click
function LeaveDetailPanel({
  request,
  canReview,
  onClose,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  request: LeaveRequest;
  canReview: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20" onClick={onClose}>
      <div
        className="h-full w-80 overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Leave Request Details</h2>
              <p className="text-xs text-gray-400">
                Submitted on {new Date(request.createdAt ?? "").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">
            <StatusBadge status={request.status} />
          </div>
        </div>
        <div className="space-y-4 p-5">
          <Field label="Employee" value={`${request.employee.firstName} ${request.employee.lastName}`} />
          <Field label="Branch" value={request.employee.branchId ?? "—"} />
          <Field label="Leave Type" value={TYPE_LABEL[request.leaveType]} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" value={new Date(request.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            <Field label="End Date" value={new Date(request.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</p>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{request.reason || "—"}</p>
          </div>
        </div>
        {canReview && request.status === "PENDING" && (
          <div className="border-t p-5 flex gap-3">
            <button
              disabled={approving || rejecting}
              onClick={onApprove}
              className="flex-1 rounded-full py-2.5 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#16A34A" }}
            >
              {approving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Approve"}
            </button>
            <button
              disabled={approving || rejecting}
              onClick={onReject}
              className="flex-1 rounded-full py-2.5 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: BRAND }}
            >
              {rejecting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reject"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
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
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct,100)}%`, backgroundColor: BRAND }} />
            </div>
            <p className="text-xs text-gray-400">{used} used</p>
          </div>
        );
      })}
    </div>
  );
}

export default function LeavePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";
  const canReview = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LeaveStatus>(isEmployee ? "" : "PENDING");
  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);

  const currentYear = new Date().getFullYear();

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: !isEmployee,
  });

  const filters = useMemo(() => ({
    status: statusFilter || undefined,
    ...(isEmployee && user?.employee ? { employeeId: user.employee.id } : {}),
  }), [statusFilter, isEmployee, user]);

  const query = useQuery({
    queryKey: ["leave-requests", filters],
    queryFn: () => listRequests(filters),
  });

  const balancesQuery = useQuery({
    queryKey: ["leave-balances", { employeeId: user?.employee?.id, year: currentYear }],
    queryFn: () => listBalances({ employeeId: user!.employee!.id, year: currentYear }),
    enabled: isEmployee && !!user?.employee,
  });


  const approveMut = useMutation({
    mutationFn: (id: string) => reviewRequest(id, { status: "APPROVED" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave-requests"] }); toast("Request approved", "success"); setDetailRequest(null); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => reviewRequest(id, { status: "REJECTED" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave-requests"] }); toast("Request rejected", "success"); setDetailRequest(null); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const filtered = useMemo(() => {
    let data = query.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(q)
      );
    }
    if (branchId) {
      data = data.filter((r) => r.employee.branchId === branchId);
    }
    return data;
  }, [query.data, search, branchId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEmployee ? "My Leave" : "Leave Management"}
        </h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setBalanceOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
          )}
          {!isAdmin && (
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm"
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

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-4 rounded-2xl bg-white p-5 shadow-sm">
        {!isEmployee && (
          <div className="space-y-1 flex-1 min-w-[160px]">
            <p className="text-xs font-medium text-gray-500">Search Employee</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}
        {!isEmployee && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">Branch</p>
            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All Branches</option>
              {branchesQuery.data?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Status</p>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
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
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Employee</th>
              {!isEmployee && <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Branch</th>}
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Leave Type</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date Range</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {query.isLoading && (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" /></td></tr>
            )}
            {!query.isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">No leave requests found.</td></tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50/80"
                onClick={() => canReview ? setDetailRequest(r) : setReviewTarget(r)}
              >
                <td className="px-5 py-4 font-semibold text-gray-800">
                  {r.employee.firstName} {r.employee.lastName}
                </td>
                {!isEmployee && (
                  <td className="px-5 py-4 text-gray-600">{r.employee.position}</td>
                )}
                <td className="px-5 py-4 text-gray-600">{TYPE_LABEL[r.leaveType]}</td>
                <td className="px-5 py-4 tabular-nums text-gray-600">
                  {new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" – "}
                  {new Date(r.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail slide-over panel */}
      {detailRequest && (
        <LeaveDetailPanel
          request={detailRequest}
          canReview={canReview}
          onClose={() => setDetailRequest(null)}
          onApprove={() => approveMut.mutate(detailRequest.id)}
          onReject={() => rejectMut.mutate(detailRequest.id)}
          approving={approveMut.isPending}
          rejecting={rejectMut.isPending}
        />
      )}

      <LeaveReviewDialog
        open={!!reviewTarget}
        onOpenChange={(o) => !o && setReviewTarget(null)}
        request={reviewTarget}
      />
      <LeaveRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
      {isAdmin && <LeaveBalanceDialog open={balanceOpen} onOpenChange={setBalanceOpen} />}
    </div>
  );
}
