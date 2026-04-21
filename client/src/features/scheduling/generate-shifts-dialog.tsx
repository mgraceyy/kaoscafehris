import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { generateShifts } from "./generate-shifts.api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

export default function GenerateShiftsDialog({ open, onOpenChange, branchId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [excludeWeekendsAndHolidays, setExcludeWeekendsAndHolidays] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      generateShifts({
        branchId,
        startDate,
        endDate,
        excludeWeekendsAndHolidays,
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast(`${result.message}`, "success");
      if (result.errors.length > 0) {
        console.error("Generate shifts errors:", result.errors);
      }
      handleClose();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function handleClose() {
    setStartDate("");
    setEndDate("");
    setExcludeWeekendsAndHolidays(true);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId || !startDate || !endDate) {
      toast("Please fill in all fields", "error");
      return;
    }
    if (startDate > endDate) {
      toast("Start date must be before end date", "error");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Generate Default Shifts</DialogTitle>
        <DialogDescription>
          Create shifts for all employees with a default shift in the selected date range.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeWeekendsAndHolidays}
              onChange={(e) => setExcludeWeekendsAndHolidays(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Exclude weekends and public holidays</span>
          </label>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          ℹ️ Shifts will be created only for employees with a default shift and dates where they
          don't already have an assignment.
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Generate Shifts
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
