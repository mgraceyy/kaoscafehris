import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
  type HolidayType,
  type PublicHoliday,
} from "./holidays.api";

const BRAND = "#8C1515";

interface FormState {
  date: string;
  name: string;
  type: HolidayType;
  amount: number;
  percentage: number | null;
}

const DEFAULT_FORM: FormState = {
  date: "",
  name: "",
  type: "REGULAR",
  amount: 0,
  percentage: null,
};

export default function HolidaysPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [searchTitle, setSearchTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PublicHoliday | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const query = useQuery({
    queryKey: ["holidays", year],
    queryFn: () => listHolidays(year),
  });

  const filtered = useMemo(() => {
    if (!query.data) return [];
    if (!searchTitle) return query.data;
    const q = searchTitle.toLowerCase();
    return query.data.filter((h) => h.name.toLowerCase().includes(q));
  }, [query.data, searchTitle]);

  const createMut = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      toast("Holiday added", "success");
      resetForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Omit<PublicHoliday, "id">> }) =>
      updateHoliday(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      toast("Holiday updated", "success");
      resetForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      toast("Holiday deleted", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  useEffect(() => {
    if (editing) {
      setForm({
        date: editing.date.slice(0, 10),
        name: editing.name,
        type: editing.type,
        amount: editing.amount,
        percentage: editing.percentage,
      });
      setShowForm(true);
    }
  }, [editing]);

  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditing(null);
    setShowForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.name) return;
    if (editing) {
      updateMut.mutate({ id: editing.id, body: form });
    } else {
      createMut.mutate(form);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Holidays</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditing(null); setForm(DEFAULT_FORM); setShowForm(true); }}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="mb-5 flex gap-4 rounded-lg border bg-card p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              id="hol-search"
              type="text"
              placeholder="Search by title..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Holiday Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update holiday details" : "Create a new holiday entry"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="hol-date">Date</Label>
            <Input
              id="hol-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hol-title">Holiday Title</Label>
            <Input
              id="hol-title"
              type="text"
              required
              placeholder="e.g., New Year, Christmas"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Pay mode toggle */}
          <div className="space-y-2">
            <Label>Holiday Pay Mode</Label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                type="button"
                className={`flex-1 py-2 font-medium transition-colors ${form.percentage === null ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setForm((f) => ({ ...f, percentage: null }))}
              >
                Fixed Amount (₱)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 font-medium transition-colors ${form.percentage !== null ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setForm((f) => ({ ...f, percentage: f.percentage ?? 100 }))}
              >
                % of Daily Rate
              </button>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
              {form.percentage !== null
                ? "Percentage mode is active — holiday pay will be computed as a % of each employee's daily rate. Set to Fixed Amount to use a flat peso value instead."
                : "Fixed amount mode is active — the same peso amount applies to all employees. Switch to % of Daily Rate to compute based on each employee's salary instead."}
            </p>
          </div>

          {form.percentage === null ? (
            <div className="space-y-2">
              <Label htmlFor="hol-pay">Fixed Amount (₱)</Label>
              <Input
                id="hol-pay"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="hol-pct">Percentage of Daily Rate (%)</Label>
              <Input
                id="hol-pct"
                type="number"
                step="0.01"
                min="0"
                max="1000"
                value={form.percentage}
                onChange={(e) => setForm((f) => ({ ...f, percentage: Number(e.target.value) }))}
              />
              <p className="text-xs text-gray-500">
                e.g. 100 = one full day's pay, 30 = 30% of daily rate (for special non-working holidays)
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Holiday Title</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Holiday Pay</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {query.isLoading && (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
                </td>
              </tr>
            )}
            {!query.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-gray-400">
                  {searchTitle ? "No holidays match your search." : `No holidays for ${year}. Click "+ Add Holiday" to add one.`}
                </td>
              </tr>
            )}
            {filtered.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2 text-gray-700">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    {new Date(h.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-gray-700">
                  {h.name}
                </td>
                <td className="px-5 py-4 tabular-nums font-medium text-gray-700">
                  {h.percentage !== null
                    ? <span>{h.percentage}% of daily rate</span>
                    : <span>₱{Number(h.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  }
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditing(h)}
                      className="text-gray-400 hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMut.mutate(h.id)}
                      disabled={deleteMut.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
