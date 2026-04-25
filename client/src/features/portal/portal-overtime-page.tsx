import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  getMyOvertimeRequests,
  createOvertimeRequest,
  type OvertimeRequest,
} from "./portal.api";

const BRAND = "#8C1515";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtDate(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

type OTStatus = OvertimeRequest["status"];

function StatusBadge({ status }: { status: OTStatus }) {
  const map: Record<OTStatus, { bg: string; color: string; label: string }> = {
    PENDING:  { bg: "#fce9e9", color: BRAND,      label: "Pending"  },
    APPROVED: { bg: "#edf6ea", color: "#4e8a40",  label: "Approved" },
    REJECTED: { bg: "#f3f3f3", color: "#888",     label: "Rejected" },
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

function FileRequestSheet({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => createOvertimeRequest({ date, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-overtime"] });
      toast("Overtime request submitted", "success");
      onClose();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { toast("Please select a date", "error"); return; }
    if (!reason.trim()) { toast("Please enter a reason", "error"); return; }
    mut.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 pt-14 pb-5" style={{ backgroundColor: BRAND }}>
        <h2 className="text-xl font-bold text-white">File OT Request</h2>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" style={{ backgroundColor: "#FAF0F0" }}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe why overtime is needed…"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 resize-none"
            />
          </div>
        </div>

        <div className="px-5 pb-8 pt-3 bg-white border-t border-gray-100">
          <button
            type="submit"
            disabled={mut.isPending}
            className="w-full rounded-full py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            {mut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PortalOvertimePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-overtime"],
    queryFn: getMyOvertimeRequests,
  });

  return (
    <div style={{ backgroundColor: "#FAF0F0", minHeight: "100vh" }}>
      {/* Header */}
      <div className="rounded-b-[28px] px-6 pt-14 pb-6" style={{ backgroundColor: BRAND }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-0.5">Employee Portal</p>
            <h1 className="text-white text-2xl font-bold">Overtime</h1>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            File Request
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 pb-24 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-14">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <p className="py-14 text-center text-sm text-red-500">
            {extractErrorMessage(error, "Failed to load overtime requests")}
          </p>
        )}

        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#f3e8e8" }}>
              <Plus className="h-6 w-6" style={{ color: BRAND }} />
            </div>
            <p className="font-medium text-gray-700">No overtime requests yet</p>
            <p className="mt-1 text-sm text-gray-400">Tap "File Request" to submit one</p>
          </div>
        )}

        {data?.map((req) => (
          <div key={req.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{fmtDate(req.date)}</p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{req.reason}</p>
              </div>
              <StatusBadge status={req.status} />
            </div>
            {req.reviewNotes && (
              <div className="mt-2.5 rounded-xl px-3 py-2 text-xs text-gray-600" style={{ backgroundColor: "#FAF0F0" }}>
                <span className="font-medium text-gray-700">Note: </span>{req.reviewNotes}
              </div>
            )}
          </div>
        ))}
      </div>

      {sheetOpen && <FileRequestSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
