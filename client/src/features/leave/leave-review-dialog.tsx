import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { listBalances, reviewRequest, type LeaveRequest } from "./leave.api";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
}

export default function LeaveReviewDialog({ open, onOpenChange, request }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const year = request ? new Date(request.startDate).getUTCFullYear() : undefined;

  const balancesQuery = useQuery({
    queryKey: ["leave-balances", { employeeId: request?.employeeId, year }],
    queryFn: () =>
      listBalances({ employeeId: request!.employeeId, year: year! }),
    enabled: open && !!request,
  });

  const matchingBalance = balancesQuery.data?.find(
    (b) => b.leaveType === request?.leaveType
  );

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
    if (open) reset({ status: "APPROVED", reviewNotes: "" });
  }, [open, request?.id, reset]);

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!request) throw new Error("Missing request");
      return reviewRequest(request.id, {
        status: values.status,
        reviewNotes: values.reviewNotes?.trim() || undefined,
      });
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      toast(
        values.status === "APPROVED" ? "Leave approved" : "Leave rejected",
        "success"
      );
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Review leave request</DialogTitle>
        <DialogDescription>
          {request
            ? `${request.employee.firstName} ${request.employee.lastName} · ${request.leaveType} · ${request.totalDays} day(s)`
            : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-4">
        {request && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <span className="text-muted-foreground">Dates:</span>{" "}
                <span className="tabular-nums">
                  {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Reason:</span>{" "}
                {request.reason || "—"}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-md border p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Balance ({year})
          </div>
          {balancesQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : request?.leaveType === "UNPAID" ? (
            <p className="text-muted-foreground">
              Unpaid leave does not consume a balance.
            </p>
          ) : matchingBalance ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Total: <strong>{matchingBalance.totalDays}</strong>
              </span>
              <span>
                Used: <strong>{matchingBalance.usedDays}</strong>
              </span>
              <span>
                Remaining: <strong>{matchingBalance.remainingDays}</strong>
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No balance set for this leave type — approval will not track deduction.
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-3"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="status">Decision</Label>
            <Select id="status" {...register("status")}>
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewNotes">Notes (optional)</Label>
            <Textarea
              id="reviewNotes"
              rows={3}
              placeholder="Explain approval / rejection for the record…"
              {...register("reviewNotes")}
            />
            {errors.reviewNotes && (
              <p className="text-xs text-destructive">
                {errors.reviewNotes.message}
              </p>
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
