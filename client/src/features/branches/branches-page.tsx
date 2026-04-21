import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Pencil } from "lucide-react";
import { extractErrorMessage } from "@/lib/api";
import {
  listBranches,
  type Branch,
} from "./branches.api";
import BranchFormDialog from "./branch-form-dialog";

const BRAND = "#8C1515";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={
        active
          ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
          : { backgroundColor: "#F3F4F6", color: "#6B7280" }
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function BranchesPage() {
  const [dialogBranch, setDialogBranch] = useState<Branch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["branches", {}],
    queryFn: () => listBranches(),
  });

  function openCreate() {
    setDialogBranch(null);
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setDialogBranch(branch);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Branches</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: BRAND }}
        >
          + Add Branch
        </button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Branch Name</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Address</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Branch Manager</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Employees</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-red-500 text-sm">
                  {extractErrorMessage(query.error, "Failed to load branches")}
                </td>
              </tr>
            )}
            {query.data && query.data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  No branches yet. Click "+ Add Branch" to create one.
                </td>
              </tr>
            )}
            {query.data?.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4 font-semibold text-gray-800">{b.name}</td>
                <td className="px-5 py-4 text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {[b.address, b.city].filter(Boolean).join(", ")}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400">—</td>
                <td className="px-5 py-4 tabular-nums text-gray-700">
                  {b._count?.employees ?? 0}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge active={b.isActive} />
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => openEdit(b)}
                    className="text-gray-400 hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BranchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branch={dialogBranch}
      />
    </div>
  );
}
