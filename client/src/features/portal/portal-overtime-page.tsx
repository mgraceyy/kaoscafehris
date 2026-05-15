import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { TimePicker } from "@/components/ui/time-picker";
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

function computeOtHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

type OTStatus = OvertimeRequest["status"];

function StatusBadge({ status }: { status: OTStatus }) {
  const map: Record<OTStatus, { bg: string; color: string; label: string }> = {
    PENDING:  { bg: "#fce9e9", color: BRAND,     label: "Pending"  },
    APPROVED: { bg: "#edf6ea", color: "#4e8a40", label: "Approved" },
    REJECTED: { bg: "#f3f3f3", color: "#888",    label: "Rejected" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function OTCard({ req }: { req: OvertimeRequest }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900">{fmtDate(req.date)}</p>
          {req.startTime && req.endTime && (
            <p className="text-sm text-gray-500 mt-0.5">
              {fmtTime(req.startTime)} – {fmtTime(req.endTime)}
              {req.otHours && (
                <span className="ml-2 font-semibold" style={{ color: BRAND }}>
                  {Number(req.otHours).toFixed(2)} hrs
                </span>
              )}
            </p>
          )}
          {!req.startTime && req.otHours && (
            <p className="text-sm font-semibold mt-0.5" style={{ color: BRAND }}>
              {Number(req.otHours).toFixed(2)} hrs
            </p>
          )}
        </div>
        <StatusBadge status={req.status} />
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{req.reason}</p>

      {req.reviewNotes && (
        <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "#FAF0F0" }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: BRAND }}>Remarks</p>
          <p className="text-sm text-gray-700">{req.reviewNotes}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Submitted {fmtDate(req.createdAt ?? req.date)}
      </p>
    </div>
  );
}

// ─── File OT Request Sheet ───────────────────────────────────────────────────

function FileRequestSheet({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const otHours = useMemo(() => {
    if (!startTime || !endTime) return undefined;
    return computeOtHours(startTime, endTime);
  }, [startTime, endTime]);

  const mut = useMutation({
    mutationFn: () => createOvertimeRequest({
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      reason,
      otHours: otHours ?? undefined,
    }),
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
    if (!startTime) { toast("Please select a start time", "error"); return; }
    if (!endTime) { toast("Please select an end time", "error"); return; }
    if (!reason.trim()) { toast("Please enter a reason", "error"); return; }
    mut.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div
        className="flex items-center justify-between px-5 pt-14 pb-5 shrink-0"
        style={{ backgroundColor: BRAND }}
      >
        <h2 className="text-xl font-bold text-white">New OT Request</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" style={{ backgroundColor: "#FAF0F0" }}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Start Time <span className="text-red-500">*</span>
              </label>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                End Time <span className="text-red-500">*</span>
              </label>
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">OT Hours</label>
            <input
              type="text"
              value={otHours !== undefined ? otHours.toFixed(2) : ""}
              readOnly
              placeholder="Auto-computed from times"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe why overtime is needed…"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 bg-white border-t border-gray-100 px-5 pb-8 pt-3 space-y-3">
          <button
            type="submit"
            disabled={mut.isPending}
            className="w-full rounded-full py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            {mut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={mut.isPending}
            className="w-full rounded-full py-3.5 text-sm font-semibold text-gray-700 border border-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PortalOvertimePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-overtime"],
    queryFn: getMyOvertimeRequests,
  });

  return (
    <div style={{ backgroundColor: "#FAF0F0", minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="rounded-b-[28px] px-6 pt-14 pb-6"
        style={{ background: `linear-gradient(135deg, #6B0F0F 0%, ${BRAND} 50%, #9E1A1A 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">My Portal</p>
            <h1 className="font-heading text-2xl italic text-white">Overtime</h1>
          </div>
          <img src="/kaos-logo.svg" alt="KAOS" className="h-10 w-auto brightness-0 invert opacity-40" />
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-4">
        <h2 className="font-heading text-lg text-gray-800">Your Requests</h2>

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
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "#f3e8e8" }}
            >
              <Clock className="h-6 w-6" style={{ color: BRAND }} />
            </div>
            <p className="font-semibold text-gray-700">No overtime requests yet</p>
            <p className="mt-1 text-sm text-gray-400">Tap the button below to file one</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-3">
            {(data ?? []).map((req) => (
              <OTCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom button */}
      <div
        className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-4 pt-6"
        style={{ background: "linear-gradient(to top, #FAF0F0 60%, transparent)" }}
      >
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full rounded-full py-4 text-sm font-semibold text-white shadow-lg active:opacity-90 transition-opacity"
          style={{ backgroundColor: BRAND }}
        >
          New OT Request
        </button>
      </div>

      {sheetOpen && <FileRequestSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
