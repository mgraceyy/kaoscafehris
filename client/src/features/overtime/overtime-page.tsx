import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  listOvertimeRequests,
  listOvertimeSchedules,
  reviewOvertimeRequest,
  deleteOvertimeSchedule,
  type OvertimeRequest,
  type OvertimeSchedule,
  type OvertimeStatus,
} from "./overtime.api";
import OvertimeRequestDialog from "./overtime-request-dialog";
import OvertimeAssignDialog from "./overtime-assign-dialog";

const BRAND = "#8C1515";

type Row =
  | { kind: "request"; data: OvertimeRequest }
  | { kind: "schedule"; data: OvertimeSchedule };

function statusBadge(status: OvertimeStatus) {
  switch (status) {
    case "PENDING": return <Badge variant="warn">Pending</Badge>;
    case "APPROVED": return <Badge variant="success">Approved</Badge>;
    case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
  }
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

  const requestsQuery = useQuery({
    queryKey: ["overtime", {}],
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

  const approve = useMutation({
    mutationFn: (r: OvertimeRequest) => reviewOvertimeRequest(r.id, { status: "APPROVED" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["overtime"] }); toast("Overtime approved", "success"); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const reject = useMutation({
    mutationFn: (r: OvertimeRequest) => reviewOvertimeRequest(r.id, { status: "REJECTED" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["overtime"] }); toast("Overtime rejected", "success"); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOvertimeSchedule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["overtime-schedules"] }); toast("Schedule removed", "success"); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const isLoading = requestsQuery.isLoading || (canReview && schedulesQuery.isLoading);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Overtime</h1>
          <p className="text-sm text-gray-400 mt-1">{todayLabel()}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEmployee && (
            <button
              onClick={() => setRequestOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <Plus className="h-4 w-4" />
              Request Overtime
            </button>
          )}
          {canReview && (
            <button
              onClick={() => { setEditing(null); setAssignOpen(true); }}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              <Plus className="h-4 w-4" />
              Assign Overtime
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
        {!isEmployee && (
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                id="ot-search"
                type="text"
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none"
              />
            </div>
          </div>
        )}
        <div>
          <Select
            id="ot-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="">All</option>
            <option value="ASSIGNED">Assigned OT</option>
            <option value="PENDING">Pending Requests</option>
            <option value="APPROVED">Approved Requests</option>
            <option value="REJECTED">Rejected Requests</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {!isEmployee && <TableHead>Employee</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              {canReview && <TableHead className="w-0" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={canReview ? 6 : 5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canReview ? 6 : 5} className="py-10 text-center text-muted-foreground">
                  No overtime records found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              if (row.kind === "request") {
                const r = row.data;
                return (
                  <TableRow key={`req-${r.id}`}>
                    {!isEmployee && (
                      <TableCell>
                        <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                        <div className="text-xs text-muted-foreground">{r.employee.employeeId} · {r.employee.position}</div>
                      </TableCell>
                    )}
                    <TableCell className="tabular-nums">{r.date.slice(0, 10)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Request
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="line-clamp-2 text-sm text-muted-foreground">{r.reason}</span>
                      {r.reviewNotes && (
                        <span className="block text-xs text-muted-foreground mt-0.5 italic">Note: {r.reviewNotes}</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    {canReview && (
                      <TableCell className="space-x-1 whitespace-nowrap text-right">
                        {r.status === "PENDING" && (
                          <>
                            <Button size="sm" variant="outline" disabled={approve.isPending || reject.isPending} onClick={() => approve.mutate(r)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={approve.isPending || reject.isPending} onClick={() => reject.mutate(r)}>
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              }

              const s = row.data;
              return (
                <TableRow key={`sched-${s.id}`}>
                  {!isEmployee && (
                    <TableCell>
                      <div className="font-medium">{s.employee.firstName} {s.employee.lastName}</div>
                      <div className="text-xs text-muted-foreground">{s.employee.employeeId} · {s.employee.position}</div>
                    </TableCell>
                  )}
                  <TableCell className="tabular-nums">{s.date.slice(0, 10)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Assigned
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <span className="tabular-nums text-sm">{fmt12(s.startTime)} – {fmt12(s.endTime)}</span>
                    {s.notes && (
                      <span className="block text-xs text-muted-foreground mt-0.5">{s.notes}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">Scheduled</Badge>
                  </TableCell>
                  {canReview && (
                    <TableCell className="space-x-1 whitespace-nowrap text-right">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(s); setAssignOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteMut.isPending}
                        onClick={() => { if (confirm("Remove this overtime schedule?")) deleteMut.mutate(s.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <OvertimeRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
      <OvertimeAssignDialog
        open={assignOpen}
        onOpenChange={(v) => { setAssignOpen(v); if (!v) setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}
