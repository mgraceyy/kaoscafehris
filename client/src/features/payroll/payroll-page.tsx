import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Search, Settings } from "lucide-react";
import { extractErrorMessage } from "@/lib/api";
import { listBranches } from "@/features/branches/branches.api";
import { listRuns, type PayrollRunSummary, type PayrollStatus } from "./payroll.api";
import PayrollRunCreateDialog from "./payroll-run-create-dialog";

const BRAND = "#8C1515";

function StatusBadge({ status }: { status: PayrollStatus }) {
  const map: Record<PayrollStatus, { bg: string; color: string; label: string }> = {
    DRAFT:      { bg: "#F3F4F6", color: "#6B7280", label: "Draft" },
    PROCESSING: { bg: "#FEF3C7", color: "#D97706", label: "Processing" },
    COMPLETED:  { bg: "#DCFCE7", color: "#16A34A", label: "Finalized" },
    CANCELLED:  { bg: "#FEE2E2", color: "#DC2626", label: "Cancelled" },
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

export default function PayrollPage() {
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const branchesQuery = useQuery({
    queryKey: ["branches", {}],
    queryFn: () => listBranches(),
  });

  const filters = useMemo(() => ({ branchId: branchId || undefined }), [branchId]);

  const query = useQuery<PayrollRunSummary[]>({
    queryKey: ["payroll-runs", filters],
    queryFn: () => listRuns(filters),
  });

  const filtered = useMemo(() => {
    const data = query.data ?? [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.branch.name.toLowerCase().includes(q));
  }, [query.data, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Compensation</p>
          <h1 className="font-heading text-3xl text-gray-900">Payroll</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => {}}
            title="Payroll settings"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
            style={{ backgroundColor: BRAND }}
          >
            + New Run
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl bg-white p-5 shadow-sm animate-fade-up stagger-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Branch</p>
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
        </div>
      </div>

      {/* Table */}
      <div className="animate-fade-up stagger-3 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead style={{ background: "#FDFAFA" }}>
            <tr style={{ borderBottom: "1px solid #F5EDED" }}>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Branch / Period</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Payslips</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Latest Status</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#F5EDED" }}>
            {query.isLoading && (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-red-500">
                  {extractErrorMessage(query.error, "Failed to load payroll runs")}
                </td>
              </tr>
            )}
            {!query.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-gray-400">
                  No payroll runs yet. Click "+ New Run" to create one.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-[#FAF5F5]" style={{ borderBottom: "1px solid #F5EDED" }}>
                <td className="px-5 py-4">
                  <p className="font-semibold" style={{ color: BRAND }}>{r.branch.name}</p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {r.periodStart.slice(0, 10)} → {r.periodEnd.slice(0, 10)}
                  </p>
                </td>
                <td className="px-5 py-4 tabular-nums text-gray-600">{r._count.payslips}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-4">
                  <Link
                    to={`/payroll/${r.id}`}
                    className="flex items-center text-gray-400 hover:text-primary transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PayrollRunCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
