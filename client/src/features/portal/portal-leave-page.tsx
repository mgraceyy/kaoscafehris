import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  createRequest,
  listRequests,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "@/features/leave/leave.api";
import { getMyLeaveBalances } from "./portal.api";

const BRAND = "#8C1515";
const ROSE = "#a28587";
const AMBER = "#C4843A";

const TYPE_LABEL: Record<LeaveType, string> = {
  VACATION: "Vacation Leave",
  SICK: "Sick Leave",
  EMERGENCY: "Emergency Leave",
  MATERNITY: "Maternity Leave",
  PATERNITY: "Paternity Leave",
  UNPAID: "Unpaid Leave",
};

const TYPE_COLORS: Record<LeaveType, string> = {
  VACATION: BRAND,
  SICK: ROSE,
  EMERGENCY: AMBER,
  MATERNITY: "#7a3db0",
  PATERNITY: "#7a3db0",
  UNPAID: "#888",
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map = {
    PENDING:   { bg: "#fce9e9", color: BRAND, label: "Pending" },
    APPROVED:  { bg: "#edf6ea", color: "#4e8a40", label: "Approved" },
    REJECTED:  { bg: "#f3f3f3", color: "#888", label: "Rejected" },
    CANCELLED: { bg: "#f3f3f3", color: "#888", label: "Cancelled" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function LeaveCard({ request }: { request: LeaveRequest }) {
  const typeColor = TYPE_COLORS[request.leaveType];
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="font-semibold text-sm" style={{ color: typeColor }}>{TYPE_LABEL[request.leaveType]}</p>
        <StatusBadge status={request.status} />
      </div>

      {request.reason && (
        <p className="text-sm text-gray-600 mb-3">{request.reason}</p>
      )}

      <div className="flex gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">FROM</div>
          <div className="text-sm font-semibold text-gray-800">{fmtDate(request.startDate.slice(0, 10))}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">TO</div>
          <div className="text-sm font-semibold text-gray-800">{fmtDate(request.endDate.slice(0, 10))}</div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Submitted {fmtDate(request.createdAt.slice(0, 10))}
      </p>
    </div>
  );
}

// ─── New Leave Request Form ──────────────────────────────────────────────────

function NewLeaveRequestForm({
  employeeId,
  onClose,
}: {
  employeeId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [leaveType, setLeaveType] = useState<LeaveType>("VACATION");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => {
      if (!startDate || !endDate) throw new Error("Please fill in all required fields");
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      );
      return createRequest({ employeeId, leaveType, startDate, endDate, totalDays, reason: reason || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast("Leave request submitted", "success");
      onClose();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5" style={{ backgroundColor: BRAND }}>
        <h2 className="text-xl font-bold text-white">New Leave Request</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5" style={{ backgroundColor: "#FAF0F0" }}>
        {/* Date Applied */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Date Applied <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={new Date().toISOString().slice(0, 10)}
              readOnly
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 pr-10"
            />
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" style={{ color: BRAND }} />
          </div>
        </div>

        {/* Leave Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Leave Date <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Start Date</p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">End Date</p>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Leave Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 pr-10"
            >
              {Object.entries(TYPE_LABEL).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for leave"
            rows={5}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-8 pt-3 bg-white border-t border-gray-100 space-y-3">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="w-full rounded-full py-3.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: BRAND }}
        >
          {mut.isPending ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            "Submit"
          )}
        </button>
        <button
          onClick={onClose}
          disabled={mut.isPending}
          className="w-full rounded-full py-3.5 text-sm font-semibold text-gray-700 border border-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PortalLeavePage() {
  const user = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const currentYear = new Date().getFullYear();

  const query = useQuery({
    queryKey: ["leave-requests", { employeeId: user?.employee?.id }],
    queryFn: () =>
      listRequests(user?.employee ? { employeeId: user.employee!.id } : {}),
    enabled: !!user?.employee,
  });

  const balanceQuery = useQuery({
    queryKey: ["portal-leave-balances", currentYear],
    queryFn: () => getMyLeaveBalances(currentYear),
  });

  return (
    <div className="relative">
      {/* Header */}
      <div className="rounded-b-[28px] px-6 pt-14 pb-6" style={{ background: `linear-gradient(135deg, #6B0F0F 0%, ${BRAND} 50%, #9E1A1A 100%)` }}>
        <div className="flex items-center justify-between animate-fade-up">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">My Portal</p>
            <h1 className="font-heading text-2xl italic text-white">Leave Request</h1>
          </div>
          <img src="/kaos-logo.svg" alt="KAOS" className="h-10 w-auto brightness-0 invert opacity-40" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-4">
        {/* Leave balance strip */}
        <div className="animate-fade-up stagger-2 bg-white rounded-2xl p-4 shadow-sm" style={{ borderTop: `3px solid ${BRAND}` }}>
          {balanceQuery.isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : !balanceQuery.data || balanceQuery.data.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-1">No leave balances configured yet.</p>
          ) : (
            <div className="flex overflow-x-auto gap-4 justify-around">
              {balanceQuery.data.map((b) => (
                <div key={b.id} className="text-center shrink-0">
                  <div className="font-heading text-2xl leading-none" style={{ color: BRAND }}>
                    {parseFloat(b.remainingDays)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {TYPE_LABEL[b.leaveType as LeaveType]?.replace(" Leave", "") ?? b.leaveType} left
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 className="font-heading text-lg text-gray-800 mt-4">Your Requests</h2>

        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : query.data?.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No leave requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {(query.data ?? []).map((r) => (
              <LeaveCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom button */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-1">
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-full py-4 text-sm font-semibold text-white shadow-lg transition-colors"
          style={{ backgroundColor: BRAND }}
        >
          New Leave Request
        </button>
      </div>

      {showForm && user?.employee && (
        <NewLeaveRequestForm
          employeeId={user.employee.id}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
