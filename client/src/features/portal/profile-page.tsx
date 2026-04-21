import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound, Loader2, Pencil } from "lucide-react";
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
  changePassword,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  type UpdateProfileInput,
} from "./portal.api";

const profileSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(20).optional(),
  emergencyName: z.string().trim().max(120).optional(),
  emergencyPhone: z.string().trim().max(30).optional(),
  emergencyRelation: z.string().trim().max(60).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pwOpen, setPwOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const query = useQuery({ queryKey: ["portal-profile"], queryFn: getProfile });

  const photoMut = useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
      toast("Photo updated", "success");
      if (photoInputRef.current) photoInputRef.current.value = "";
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-destructive">
          {extractErrorMessage(query.error, "Failed to load profile")}
        </p>
      </div>
    );
  }

  const profile = query.data;
  const emp = profile.employee;

  const initials = emp
    ? `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase()
    : profile.email[0].toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal details and account settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4" />
            Change Password
          </Button>
        </div>
      </div>

      {/* Profile summary card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar with upload overlay */}
          <div className="shrink-0">
            <div className="group relative h-20 w-20">
              {emp?.profilePhoto ? (
                <img
                  src={emp.profilePhoto}
                  alt={initials}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                  {initials}
                </div>
              )}
              <button
                type="button"
                disabled={photoMut.isPending}
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                title="Change photo"
              >
                {photoMut.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) photoMut.mutate(file);
                }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              Click to change
            </p>
          </div>

          {/* Info grid */}
          <div className="flex-1 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Name</div>
              <div className="text-base font-semibold">
                {emp ? `${emp.firstName} ${emp.lastName}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Employee ID</div>
              <div className="text-base">{emp?.employeeId ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Email</div>
              <div className="text-base">{profile.email}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Role</div>
              <div className="text-base">{profile.role}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Position</div>
              <div className="text-base">{emp?.position ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Branch</div>
              <div className="text-base">{emp?.branch?.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Date Hired</div>
              <div className="text-base">{emp?.dateHired?.slice(0, 10) ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              <div className="text-base">{emp?.employmentStatus ?? "—"}</div>
            </div>
            {emp?.phone && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Phone</div>
                <div className="text-base">{emp.phone}</div>
              </div>
            )}
            {(emp?.address || emp?.city) && (
              <div className="md:col-span-2">
                <div className="text-xs font-medium text-muted-foreground">Address</div>
                <div className="text-base">
                  {[emp.address, emp.city, emp.province, emp.zipCode].filter(Boolean).join(", ")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
      />
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

// ── Edit Profile Dialog ───────────────────────────────────────────────────────

type ProfileData = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: ProfileData;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const emp = profile.employee;

  const { register, handleSubmit, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: emp?.phone ?? "",
      address: emp?.address ?? "",
      city: emp?.city ?? "",
      province: emp?.province ?? "",
      zipCode: emp?.zipCode ?? "",
      emergencyName: emp?.emergencyName ?? "",
      emergencyPhone: emp?.emergencyPhone ?? "",
      emergencyRelation: emp?.emergencyRelation ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        phone: emp?.phone ?? "",
        address: emp?.address ?? "",
        city: emp?.city ?? "",
        province: emp?.province ?? "",
        zipCode: emp?.zipCode ?? "",
        emergencyName: emp?.emergencyName ?? "",
        emergencyPhone: emp?.emergencyPhone ?? "",
        emergencyRelation: emp?.emergencyRelation ?? "",
      });
    }
  }, [open, emp, reset]);

  const mut = useMutation({
    mutationFn: (values: ProfileValues) => updateProfile(values as UpdateProfileInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
      toast("Profile updated successfully", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogDescription>
          Update your personal details below.
        </DialogDescription>
      </DialogHeader>

      {!emp && (
        <p className="text-sm text-muted-foreground pb-2">
          No employee profile is linked to this account. Contact details cannot be edited.
        </p>
      )}

      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4 pt-2" noValidate>
        {emp && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Contact Information</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ep-phone">Phone</Label>
                  <Input id="ep-phone" {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ep-address">Address</Label>
                  <Input id="ep-address" {...register("address")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ep-city">City</Label>
                  <Input id="ep-city" {...register("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ep-province">Province</Label>
                  <Input id="ep-province" {...register("province")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ep-zip">ZIP Code</Label>
                  <Input id="ep-zip" {...register("zipCode")} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Emergency Contact</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ep-ename">Contact Name</Label>
                  <Input id="ep-ename" {...register("emergencyName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ep-ephone">Contact Phone</Label>
                  <Input id="ep-ephone" {...register("emergencyPhone")} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="ep-erel">Relationship</Label>
                  <Input id="ep-erel" {...register("emergencyRelation")} />
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Close
          </Button>
          <Button type="submit" disabled={mut.isPending || !emp}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

type PwValues = z.infer<typeof pwSchema>;

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PwValues>({
    resolver: zodResolver(pwSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const mut = useMutation({
    mutationFn: (v: PwValues) =>
      changePassword({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      }),
    onSuccess: () => {
      toast("Password changed", "success");
      onOpenChange(false);
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>
          You'll stay logged in on this device after changing your password.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit((v) => mut.mutate(v))}
        className="space-y-4 pt-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="text-xs text-destructive">
              {errors.currentPassword.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mut.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Change password
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
