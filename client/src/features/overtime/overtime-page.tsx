import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Plus, Pencil, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  listOvertimeRequests,
  listOvertimeSchedules,
  revertOvertimeRequest,
  deleteOvertimeSchedule,
  type OvertimeRequest,
  type OvertimeSchedule,
  type OvertimeStatus,
} from "./overtime.api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import OvertimeRequestDialog from "./overtime-request-dialog";
import OvertimeAssignDialog from "./overtime-assign-dialog";
import OvertimeReviewDialog from "./overtime-review-dialog";

const BRAND = "#8C1515";

type Row =
  | { kind: "request"; data: OvertimeRequest }
  | { kind: "schedule"; data: OvertimeSchedule };

function StatCard({ label, value, color, stagger }: { label: string; value: number; color: string; stagger: number }) {
  return (
    <div className={`animate-fade-up stagger-${stagger} relative overflow-hidden rounded-xl bg-white p-5 shadow-sm card-hover`} style={{ borderLeft: `4px solid ${color}` }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <p className="font-heading text-4xl leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function Avatar({ first, last }: { first: string; last: string }) {
  const colors = ["#8C1515", "#2563EB", "#7C3AED", "#0891B2", "#D97706", "#16A34A"];
  const idx = (first.charCodeAt(0) + last.charCodeAt(0)) % colors.length;
  const initials = `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: colors[idx] }}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: OvertimeStatus }) {
  const map: Record<OvertimeStatus, { bg: string; color: string; label: string }> = {
    PENDING:  { bg: "#FEF9C3", color: "#CA8A04", label: "Pending" },
    APPROVED: { bg: "#DCFCE7", color: "#16A34A", label: "Approved" },
    REJECTED: { bg: "#FEE2E2", color: "#DC2626", label: "Rejected" },
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

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export default function OvertimePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canReview = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isEmployee = user?.role === "EMPLOYEE";

  const [statusFilter, setStatusFilter] = useState<"" | OvertimeStatus | "ASSIGNED">(canReview ? "" : "");
  const [search, setSearch] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<OvertimeSchedule | null>(null);
  const [revertTarget, setRevertTarget] = useState<OvertimeRequest | null>(null);
  const [reviewTarget, setReviewTarget] = useState<OvertimeRequest | null>(null);
  const [reviewInitialStatus, setReviewInitialStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");

  const requestsQuery = useQuery({
    queryKey: ["overtime"],
    queryFn: () => listOvertimeRequests({}),
  });

  const schedulesQuery = useQuery({
    queryKey: ["overtime-schedules"],
    queryFn: () => listOvertimeSchedules(),
    enabled: canReview,
  });

  const rows = useMemo<Row[]>(() => {
    const requests: Row[] = (requestsQuery.data ?? []).map((d) => ({ kind: "request", data: d }));
    const schedules: Row[] = (schedulesQuery.data ?? []).map((d) => ({ kind: "schedule", data: d }));
    let combined = [...requests, ...schedules];

    // filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      combined = combined.filter((r) => {
        const emp = r.data.employee;
        return `${emp.firstName} ${emp.lastName} ${emp.employeeId}`.toLowerCase().includes(q);
      });
    }

    // filter by type/status
    if (statusFilter === "ASSIGNED") {
      combined = combined.filter((r) => r.kind === "schedule");
    } else if (statusFilter !== "") {
      combined = combined.filter(
        (r) => r.kind === "request" && (r.data as OvertimeRequest).status === statusFilter
      );
    }

    // sort by date desc
    combined.sort((a, b) => {
      const da = a.data.date.slice(0, 10);
      const db = b.data.date.slice(0, 10);
      return db.localeCompare(da);
    });

    return combined;
  }, [requestsQuery.data, schedulesQuery.data, search, statusFilter]);


  const revert = useMutation({
    mutationFn: (r: OvertimeRequest) => revertOvertimeRequest(r.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["overtime"] }); toast("Overtime request reverted to pending", "success"); setRevertTarget(null); },
    onError: (err) => { toast(extractErrorMessage(err), "error"); setRevertTarget(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOvertimeSchedule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["overtime-schedules"] }); toast("Schedule removed", "success"); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const allRequests = requestsQuery.data ?? [];
  const stats = useMemo(() => ({
    pending:  allRequests.filter((r) => r.status === "PENDING").length,
    approved: allRequests.filter((r) => r.status === "APPROVED").length,
    rejected: allRequests.filter((r) => r.status === "REJECTED").length,
    total:    allRequests.length,
  }), [allRequests]);

  const isLoading = requestsQuery.isLoading || (canReview && schedulesQuery.isLoading);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Overtime</h1>
          <p className="text-sm text-gray-400 mt-1">{todayLabel()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEmployee && (
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <Plus className="h-4 w-4" />
              Request Overtime
            </button>
          )}
          {canReview && (
            <button
              onClick={() => { setEditing(null); setAssignOpen(true); }}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <Plus className="h-4 w-4" />
              Assign Overtime
            </button>
          )}
        </div>
      </div>

      {/* Stat cards — admin/manager only */}
      {!isEmployee && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Pending"  value={stats.pending}  color="#CA8A04" stagger={1} />
          <StatCard label="Approved" value={stats.approved} color="#16A34A" stagger={2} />
          <StatCard label="Rejected" value={stats.rejected} color="#DC2626" stagger={3} />
          <StatCard label="Total"    value={stats.total}    color={BRAND}   stagger={4} />
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="ASSIGNED">Assigned OT</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="animate-fade-up overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead style={{ background: "#FDFAFA" }}>
            <tr style={{ borderBottom: "1px solid #F5EDED" }}>
              {!isEmployee && <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Employee</th>}
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Date</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Type</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Details</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Status</th>
              {canReview && <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#F5EDED" }}>
            {isLoading && (
              <tr>
                <td colSpan={canReview ? 6 : 5} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={canReview ? 6 : 5} className="py-12 text-center text-sm text-gray-400">
                  No overtime records found.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              if (row.kind === "request") {
                const r = row.data;
                return (
                  <tr key={`req-${r.id}`} className="hover:bg-gray-50/60">
                    {!isEmployee && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar first={r.employee.firstName} last={r.employee.lastName} />
                          <div>
                            <p className="font-semibold text-gray-800 leading-tight">{r.employee.firstName} {r.employee.lastName}</p>
                            <p className="text-xs text-gray-400">{r.employee.position}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-4 text-gray-600 tabular-nums">{r.date.slice(0, 10)}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Request
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="truncate text-gray-600">{r.reason}</p>
                      {r.reviewNotes && (
                        <p className="text-xs text-gray-400 italic mt-0.5">Note: {r.reviewNotes}</p>
                      )}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    {canReview && (
                      <td className="px-5 py-4">
                        {r.status === "PENDING" ? (
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
              }

              const s = row.data;
              return (
                <tr key={`sched-${s.id}`} className="hover:bg-gray-50/60">
                  {!isEmployee && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar first={s.employee.firstName} last={s.employee.lastName} />
                        <div>
                          <p className="font-semibold text-gray-800 leading-tight">{s.employee.firstName} {s.employee.lastName}</p>
                          <p className="text-xs text-gray-400">{s.employee.position}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-4 text-gray-600 tabular-nums">{s.date.slice(0, 10)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Assigned
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="tabular-nums text-gray-600">{fmt12(s.startTime)} – {fmt12(s.endTime)}</p>
                    {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
                      Scheduled
                    </span>
                  </td>
                  {canReview && (
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditing(s); setAssignOpen(true); }}
                          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={deleteMut.isPending}
                          onClick={() => { if (confirm("Remove this overtime schedule?")) deleteMut.mutate(s.id); }}
                          className="rounded-lg border border-gray-200 bg-white p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">Showing {rows.length} record{rows.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>

      <OvertimeRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
      <OvertimeAssignDialog
        open={assignOpen}
        onOpenChange={(v) => { setAssignOpen(v); if (!v) setEditing(null); }}
        editing={editing}
      />

      <OvertimeReviewDialog
        open={!!reviewTarget}
        onOpenChange={(o) => !o && setReviewTarget(null)}
        request={reviewTarget}
        initialStatus={reviewInitialStatus}
      />

      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(o) => !o && setRevertTarget(null)}
        title="Revert overtime request?"
        description={
          revertTarget
            ? `This will set ${revertTarget.employee.firstName} ${revertTarget.employee.lastName}'s overtime request for ${revertTarget.date.slice(0, 10)} back to Pending.`
            : ""
        }
        confirmLabel="Revert"
        onConfirm={() => revertTarget && revert.mutate(revertTarget)}
        loading={revert.isPending}
      />
    </div>
  );
}
