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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { createBranch, updateBranch, type Branch, type BranchInput } from "./branches.api";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  phone: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
}

export default function BranchFormDialog({ open, onOpenChange, branch }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", city: "", phone: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: branch?.name ?? "",
      address: branch?.address ?? "",
      city: branch?.city ?? "",
      phone: branch?.phone ?? "",
    });
  }, [open, branch, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: BranchInput = {
        name: values.name,
        address: values.address,
        city: values.city,
        phone: values.phone || undefined,
      };
      return isEdit ? updateBranch(branch!.id, payload) : createBranch(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast(isEdit ? "Branch updated" : "Branch created", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit branch" : "New branch"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the branch details below." : "Add a new KAOS Cafe location."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="name">Branch name</Label>
          <Input id="name" placeholder="KAOS Cafe — BGC" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="Street, number" {...register("address")} />
          {errors.address && (
            <p className="text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="Taguig" {...register("city")} />
            {errors.city && (
              <p className="text-xs text-destructive">{errors.city.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+63 9xx xxx xxxx" {...register("phone")} />
          </div>
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
            {isEdit ? "Save changes" : "Create branch"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
