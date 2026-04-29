import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
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
import { listBranches } from "@/features/branches/branches.api";
import {
  createShiftType,
  deleteShiftType,
  listShiftTypes,
  updateShiftType,
  type ShiftType,
} from "./shift-types.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  startTime: string;
  endTime: string;
  branchIds: string[];
}

const DEFAULT_FORM: FormState = {
  name: "",
  startTime: "08:00",
  endTime: "17:00",
  branchIds: [],
};

function toHHMM(value: string): string {
  const d = new Date(value);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function ShiftTypesDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShiftType | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const branchesQuery = useQuery({
    queryKey: ["branches", { active: true }],
    queryFn: () => listBranches({ isActive: true }),
    enabled: open,
  });

  const query = useQuery({
    queryKey: ["shift-types"],
    queryFn: () => listShiftTypes(),
    enabled: open,
  });

  // Auto-select all branches when branches load (for new template)
  useEffect(() => {
    if (branchesQuery.data && !editing && form.branchIds.length === 0) {
      setForm((f) => ({ ...f, branchIds: branchesQuery.data!.map((b) => b.id) }));
    }
  }, [branchesQuery.data, editing, form.branchIds.length]);

  const createMut = useMutation({
    mutationFn: () =>
      createShiftType({
        branchIds: form.branchIds,
        name: form.name,
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-types"] });
      toast("Shift template created", "success");
      resetForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) =>
      updateShiftType(id, {
        branchIds: form.branchIds,
        name: form.name,
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-types"] });
      toast("Shift template updated", "success");
      resetForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteShiftType,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-types"] });
      toast("Shift template deleted", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        startTime: toHHMM(editing.startTime),
        endTime: toHHMM(editing.endTime),
        branchIds: editing.branches.map((b) => b.branchId),
      });
      setShowForm(true);
    }
  }, [editing]);

  function resetForm() {
    setForm({
      ...DEFAULT_FORM,
      branchIds: branchesQuery.data?.map((b) => b.id) ?? [],
    });
    setEditing(null);
    setShowForm(false);
  }

  function toggleBranch(id: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      branchIds: checked ? [...f.branchIds, id] : f.branchIds.filter((x) => x !== id),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime) return;
    if (form.startTime === form.endTime) {
      toast("Start and end times cannot be the same", "error");
      return;
    }
    if (form.branchIds.length === 0) {
      toast("Select at least one branch", "error");
      return;
    }
    if (editing) {
      updateMut.mutate(editing.id);
    } else {
      createMut.mutate();
    }
  }

  const saving = createMut.isPending || updateMut.isPending;
  const branches = branchesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Shift Templates</DialogTitle>
        <DialogDescription>
          Manage reusable shift templates. Each template can apply to one or more branches.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pt-4 pr-1">
        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-muted/30 p-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                type="text"
                required
                placeholder="e.g., 1st Shift"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-start">Start Time</Label>
                <Input
                  id="template-start"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-end">End Time</Label>
                <Input
                  id="template-end"
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Branch multi-select */}
            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label>Applies to Branch</Label>
                <div className="rounded-md border p-2 space-y-1">
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={form.branchIds.includes(b.id)}
                        onChange={(e) => toggleBranch(b.id, e.target.checked)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Save" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="space-y-2">
          {query.isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          )}

          {!query.isLoading && (!query.data || query.data.length === 0) && !showForm && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">No shift templates yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </div>
          )}

          {!query.isLoading && query.data && query.data.length > 0 && (
            <>
              {!showForm && (
                <Button size="sm" onClick={() => setShowForm(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Template
                </Button>
              )}

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Branches</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {query.data.map((template) => (
                      <tr key={template.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-gray-800">{template.name}</td>
                        <td className="px-3 py-2 text-gray-600 tabular-nums">
                          {toHHMM(template.startTime)} - {toHHMM(template.endTime)}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {template.branches.map((b) => b.branch.name).join(", ") || "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditing(template)}
                              className="text-gray-400 hover:text-primary transition-colors p-1"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteMut.mutate(template.id)}
                              disabled={deleteMut.isPending}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
            </>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
