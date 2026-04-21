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
  branchId: string;
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

export default function ShiftTypesDialog({ open, onOpenChange, branchId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShiftType | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const query = useQuery({
    queryKey: ["shift-types", branchId],
    queryFn: () => listShiftTypes(branchId),
    enabled: open && !!branchId,
  });

  const createMut = useMutation({
    mutationFn: (input: typeof form) =>
      createShiftType({
        branchId,
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-types"] });
      toast("Shift template created", "success");
      resetForm();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  const updateMut = useMutation({
    mutationFn: (input: { id: string; data: Partial<typeof form> }) =>
      updateShiftType(input.id, input.data),
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
        startTime: editing.startTime,
        endTime: editing.endTime,
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
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      createMut.mutate(form);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Shift Templates</DialogTitle>
        <DialogDescription>
          Manage reusable shift templates for your branch. Use these templates to quickly schedule shifts.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-96 space-y-4 overflow-y-auto pt-4 pr-1">
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(true)}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </div>
          )}

          {!query.isLoading && query.data && query.data.length > 0 && (
            <>
              {!showForm && (
                <Button
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Template
                </Button>
              )}

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Time
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {query.data.map((template) => (
                      <tr key={template.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {template.name}
                        </td>
                        <td className="px-3 py-2 text-gray-600 tabular-nums">
                          {template.startTime} - {template.endTime}
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
