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
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
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
}

const DEFAULT_FORM: FormState = {
  name: "",
  startTime: "08:00",
  endTime: "17:00",
};

function toHHMM(value: string): string {
  const d = new Date(value);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function toHH24MM(value: string): string {
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export default function ShiftTypesDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShiftType | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const query = useQuery({
    queryKey: ["shift-types"],
    queryFn: () => listShiftTypes(),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createShiftType({
        name: form.name,
        startTime: form.startTime,
        endTime: form.endTime,
        breakDuration: 60,
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
        startTime: toHH24MM(editing.startTime),
        endTime: toHH24MM(editing.endTime),
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
    if (!form.name || !form.startTime || !form.endTime) return;
    if (form.startTime === form.endTime) {
      toast("Start and end times cannot be the same", "error");
      return;
    }
    if (editing) {
      updateMut.mutate(editing.id);
    } else {
      createMut.mutate();
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Shift Templates</DialogTitle>
        <DialogDescription>
          Manage reusable shift templates. Templates are available to all branches.
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
                <TimePicker
                  id="template-start"
                  value={form.startTime}
                  onChange={(v) => setForm((f) => ({ ...f, startTime: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-end">End Time</Label>
                <TimePicker
                  id="template-end"
                  value={form.endTime}
                  onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
                />
              </div>
            </div>


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
