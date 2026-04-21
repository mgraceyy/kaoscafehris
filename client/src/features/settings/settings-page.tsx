import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Shield, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { extractErrorMessage } from "@/lib/api";
import {
  bulkUpdateSettings,
  deleteGovTable,
  listGovTables,
  listSettings,
  upsertGovTable,
  type GovTable,
  type GovTableType,
  type Setting,
  type BulkUpdateItem,
} from "./settings.api";

const BRAND = "#8C1515";

// ─── Helpers ────────────────────────────────────────────────────────────────

function labelForKey(key: string): string {
  const tail = key.includes(".") ? key.split(".").slice(1).join(".") : key;
  return tail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function parseDraft(original: unknown, raw: string): unknown {
  if (typeof original === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof original === "boolean") return raw === "true" || raw === "1";
  return raw;
}

const GROUP_ICON: Record<string, React.ReactNode> = {
  company: <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#DCFCE7" }}>🏢</span>,
  payroll: <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#DCFCE7" }}>💵</span>,
  attendance: <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#FEF9C3" }}>⏰</span>,
  kiosk: <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#DBEAFE" }}>📱</span>,
};

const GROUP_LABEL: Record<string, string> = {
  company: "Company Settings",
  payroll: "Payroll Settings",
  attendance: "Attendance Settings",
  kiosk: "Kiosk Settings",
};

const GROUP_DESC: Record<string, string> = {
  company: "Configure company-wide settings",
  payroll: "Configure payroll computation rules",
  attendance: "Configure attendance tracking behavior",
  kiosk: "Configure the self-service kiosk access",
};

const GOV_TYPES: GovTableType[] = ["SSS", "PHILHEALTH", "PAGIBIG", "BIR"];

// ─── Main page ───────────────────────────────────────────────────────────────

type Tab = "general" | "government";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Settings</h1>

      <div className="mb-6 flex gap-1 rounded-full border border-gray-200 bg-white p-1 w-fit">
        {(["general", "government"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              tab === t
                ? { backgroundColor: BRAND, color: "#fff" }
                : { color: "#6B7280" }
            }
          >
            {t === "general" ? "General" : "Government Tables"}
          </button>
        ))}
      </div>

      {tab === "general" ? <GeneralTab /> : <GovernmentTab />}
    </div>
  );
}

// ─── General tab ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["settings"], queryFn: () => listSettings() });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!query.data) return;
    setDrafts(Object.fromEntries((query.data as Setting[]).map((s) => [s.key, stringifyValue(s.value)])));
  }, [query.data]);

  const grouped = useMemo((): Map<string, Setting[]> => {
    const map = new Map<string, Setting[]>();
    for (const s of (query.data ?? []) as Setting[]) {
      const key = s.group ?? "other";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [query.data]);

  const saveMut = useMutation({
    mutationFn: (items: BulkUpdateItem[]) => bulkUpdateSettings(items),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast("Settings saved", "success"); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function handleSave() {
    if (!query.data) return;
    const items: BulkUpdateItem[] = [];
    for (const s of (query.data as Setting[])) {
      const raw = drafts[s.key] ?? "";
      const parsed = parseDraft(s.value, raw);
      if (JSON.stringify(s.value) !== JSON.stringify(parsed)) {
        items.push({ key: s.key, value: parsed, group: s.group ?? undefined });
      }
    }
    if (!items.length) { toast("No changes to save", "info"); return; }
    saveMut.mutate(items);
  }

  if (query.isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Roles & Permissions card (static UI) */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#FFE4E6" }}>
            <Shield className="h-5 w-5 text-red-500" />
          </span>
          <div>
            <h2 className="font-semibold text-gray-800">Roles &amp; Permissions</h2>
            <p className="text-xs text-gray-400">Manage user roles and access permissions</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Branch Manager</p>
            <p className="text-xs text-gray-400">Branch-level management</p>
          </div>
          <button
            className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Configure
          </button>
        </div>
      </div>

      {/* Dynamic settings groups */}
      {Array.from(grouped.entries()).map(([group, items]) => (
        <div key={group} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            {GROUP_ICON[group] ?? <span className="h-9 w-9 rounded-full bg-gray-100" />}
            <div>
              <h2 className="font-semibold text-gray-800">{GROUP_LABEL[group] ?? group}</h2>
              <p className="text-xs text-gray-400">{GROUP_DESC[group] ?? ""}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{labelForKey(s.key)}</label>
                <input
                  type={typeof s.value === "number" ? "number" : "text"}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={drafts[s.key] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saveMut.isPending}
          className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: BRAND }}
        >
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Government Tables tab ───────────────────────────────────────────────────

type GovFormState = {
  type: GovTableType;
  rangeFrom: string;
  rangeTo: string;
  employeeShare: string;
  employerShare: string;
  effectiveDate: string;
};

const DEFAULT_GOV: GovFormState = {
  type: "SSS",
  rangeFrom: "0",
  rangeTo: "0",
  employeeShare: "0",
  employerShare: "0",
  effectiveDate: new Date().toISOString().slice(0, 10),
};

function GovernmentTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<"" | GovTableType>("");
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<GovTable | null>(null);
  const [form, setForm] = useState<GovFormState>(DEFAULT_GOV);
  const [confirmDelete, setConfirmDelete] = useState<GovTable | null>(null);

  const query = useQuery({
    queryKey: ["gov-tables", filterType],
    queryFn: () => listGovTables(filterType || undefined),
  });

  useEffect(() => {
    if (editEntry) {
      setForm({
        type: editEntry.type,
        rangeFrom: String(editEntry.rangeFrom),
        rangeTo: String(editEntry.rangeTo),
        employeeShare: String(editEntry.employeeShare),
        employerShare: String(editEntry.employerShare),
        effectiveDate: editEntry.effectiveDate,
      });
      setShowForm(true);
    }
  }, [editEntry]);

  const saveMut = useMutation({
    mutationFn: (v: GovFormState) =>
      upsertGovTable({
        id: editEntry?.id,
        type: v.type,
        rangeFrom: Number(v.rangeFrom),
        rangeTo: Number(v.rangeTo),
        employeeShare: Number(v.employeeShare),
        employerShare: Number(v.employerShare),
        effectiveDate: v.effectiveDate,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gov-tables"] });
      toast(editEntry ? "Entry updated" : "Entry added", "success");
      resetForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteGovTable(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gov-tables"] }); toast("Entry deleted", "success"); setConfirmDelete(null); },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function resetForm() {
    setForm(DEFAULT_GOV);
    setEditEntry(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Deductions Management</h2>
            <p className="text-xs text-gray-400">Configure payroll deductions and contribution rates</p>
          </div>
          <button
            onClick={() => { setEditEntry(null); setForm(DEFAULT_GOV); setShowForm(true); }}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="h-4 w-4" /> Add Deduction
          </button>
        </div>

        {/* Inline form */}
        {showForm && (
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">{editEntry ? "Edit Entry" : "New Deduction"}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Deduction Name</label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as GovTableType }))}
                >
                  {GOV_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Employee Rate (%)</label>
                <input type="number" step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={form.employeeShare} onChange={(e) => setForm((f) => ({ ...f, employeeShare: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Employer Rate (%)</label>
                <input type="number" step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={form.employerShare} onChange={(e) => setForm((f) => ({ ...f, employerShare: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Range From (₱)</label>
                <input type="number" step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={form.rangeFrom} onChange={(e) => setForm((f) => ({ ...f, rangeFrom: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Range To (₱)</label>
                <input type="number" step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={form.rangeTo} onChange={(e) => setForm((f) => ({ ...f, rangeTo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Effective Date</label>
                <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => saveMut.mutate(form)}
                disabled={saveMut.isPending}
                className="rounded-full px-5 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: BRAND }}
              >
                {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
              <button onClick={resetForm} className="rounded-full border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4 flex items-center gap-3">
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "" | GovTableType)}
          >
            <option value="">All Types</option>
            {GOV_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Deduction Name</th>
              <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Employee Rate</th>
              <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Employer Rate</th>
              <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {query.isLoading && <tr><td colSpan={4} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" /></td></tr>}
            {!query.isLoading && (query.data ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">No entries yet.</td></tr>
            )}
            {(query.data ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="py-3 font-medium text-gray-800">{r.type}</td>
                <td className="py-3 tabular-nums text-gray-600">{r.employeeShare}%</td>
                <td className="py-3 tabular-nums text-gray-600">{r.employerShare}%</td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditEntry(r)} className="text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setConfirmDelete(r)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete entry?"
        description={confirmDelete ? `Delete ${confirmDelete.type} bracket? This cannot be undone.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

// Pencil icon used in gov table
function Pencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
