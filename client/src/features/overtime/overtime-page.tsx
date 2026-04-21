import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  listOvertimeRequests,
  reviewOvertimeRequest,
  type OvertimeRequest,
  type OvertimeStatus,
} from "./overtime.api";
import OvertimeRequestDialog from "./overtime-request-dialog";

function statusBadge(status: OvertimeStatus) {
  switch (status) {
    case "PENDING": return <Badge variant="warn">Pending</Badge>;
    case "APPROVED": return <Badge variant="success">Approved</Badge>;
    case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
  }
}

export default function OvertimePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const canReview = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isEmployee = user?.role === "EMPLOYEE";

  const [statusFilter, setStatusFilter] = useState<"" | OvertimeStatus>(canReview ? "PENDING" : "");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);

  const query = useQuery({
    queryKey: ["overtime", { status: statusFilter }],
    queryFn: () => listOvertimeRequests({ status: statusFilter || undefined }),
  });

  const filtered = useMemo(() => {
    if (!query.data) return [];
    if (!searchEmployee) return query.data;
    const q = searchEmployee.toLowerCase();
    return query.data.filter((r) =>
      `${r.employee.firstName} ${r.employee.lastName} ${r.employee.employeeId}`
        .toLowerCase()
        .includes(q)
    );
  }, [query.data, searchEmployee]);

  const approve = useMutation({
    mutationFn: (r: OvertimeRequest) =>
      reviewOvertimeRequest(r.id, { status: "APPROVED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime"] });
      toast("Overtime approved", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const reject = useMutation({
    mutationFn: (r: OvertimeRequest) =>
      reviewOvertimeRequest(r.id, { status: "REJECTED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime"] });
      toast("Overtime rejected", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEmployee ? "My Overtime Requests" : "Overtime Requests"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEmployee
              ? "Submit requests for overtime. Approval is required before working past shift end."
              : "Review employee overtime requests."}
          </p>
        </div>
        {isEmployee && (
          <Button onClick={() => setRequestOpen(true)}>
            Request Overtime
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label htmlFor="ot-search">Search Employee</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="ot-search"
              type="text"
              placeholder="Name or ID..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ot-status">Status</Label>
          <Select
            id="ot-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | OvertimeStatus)}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {!isEmployee && <TableHead>Employee</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Review notes</TableHead>
              {canReview && <TableHead className="w-0" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={canReview ? 6 : 5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canReview ? 6 : 5} className="py-10 text-center text-muted-foreground">
                  No overtime requests.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                {!isEmployee && (
                  <TableCell>
                    <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                    <div className="text-xs text-muted-foreground">{r.employee.employeeId} · {r.employee.position}</div>
                  </TableCell>
                )}
                <TableCell className="tabular-nums">{r.date.slice(0, 10)}</TableCell>
                <TableCell className="max-w-[260px]">
                  <span className="line-clamp-2 text-sm text-muted-foreground">{r.reason}</span>
                </TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {r.reviewNotes || "—"}
                  </span>
                </TableCell>
                {canReview && (
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approve.isPending || reject.isPending}
                          onClick={() => approve.mutate(r)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approve.isPending || reject.isPending}
                          onClick={() => reject.mutate(r)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OvertimeRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}
