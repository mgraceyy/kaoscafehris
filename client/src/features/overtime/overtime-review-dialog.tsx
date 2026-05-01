import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { reviewOvertimeRequest, type OvertimeRequest } from "./overtime.api";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: OvertimeRequest | null;
  initialStatus?: "APPROVED" | "REJECTED";
}

export default function OvertimeReviewDialog({ open, onOpenChange, request, initialStatus }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: "APPROVED", reviewNotes: "" },
  });

  useEffect(() => {
    if (open) reset({ status: initialStatus ?? "APPROVED", reviewNotes: "" });
  }, [open, request?.id, initialStatus, reset]);

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!request) throw new Error("Missing request");
      return reviewOvertimeRequest(request.id, {
        status: values.status,
        reviewNotes: values.reviewNotes?.trim() || undefined,
      });
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: ["overtime"] });
      toast(
        values.status === "APPROVED" ? "Overtime approved" : "Overtime rejected",
        "success"
      );
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Review overtime request</DialogTitle>
        <DialogDescription>
          {request
            ? `${request.employee.firstName} ${request.employee.lastName} · ${request.date.slice(0, 10)}`
            : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-4">
        {request && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <span className="text-muted-foreground">Employee:</span>{" "}
                {request.employee.firstName} {request.employee.lastName} ({request.employee.employeeId})
              </span>
              <span>
                <span className="text-muted-foreground">Reason:</span>{" "}
                {request.reason || "—"}
              </span>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-3"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="ot-status">Decision</Label>
            <Select id="ot-status" {...register("status")}>
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ot-reviewNotes">Notes (optional)</Label>
            <Textarea
              id="ot-reviewNotes"
              rows={3}
              placeholder="Explain approval / rejection for the record…"
              {...register("reviewNotes")}
            />
            {errors.reviewNotes && (
              <p className="text-xs text-destructive">{errors.reviewNotes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit decision
            </Button>
          </DialogFooter>
        </form>
      </div>
    </Dialog>
  );
}
