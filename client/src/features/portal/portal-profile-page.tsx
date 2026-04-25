import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Calendar, Camera, CreditCard,
  KeyRound, Loader2, LogOut, Mail, MapPin, Phone, User, X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import { useLogout } from "@/features/auth/use-login";
import {
  changePassword,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  type UpdateProfileInput,
} from "./portal.api";

const BRAND = "#8C1515";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtDate(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ─── Edit Profile Form ───────────────────────────────────────────────────────

const profileSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function EditProfileSheet({
  initialValues,
  onClose,
}: {
  initialValues: ProfileValues;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { register, handleSubmit } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  });

  const mut = useMutation({
    mutationFn: (v: ProfileValues) => updateProfile(v as UpdateProfileInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
      toast("Profile updated", "success");
      onClose();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 pt-14 pb-5" style={{ backgroundColor: BRAND }}>
        <h2 className="text-xl font-bold text-white">Edit Profile</h2>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit((v) => mut.mutate(v))}
        className="flex flex-col flex-1"
        noValidate
      >
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" style={{ backgroundColor: "#FAF0F0" }}>
          {[
            { label: "Phone Number", name: "phone" as const, placeholder: "+63 XXX XXX XXXX" },
            { label: "Address", name: "address" as const, placeholder: "Street address" },
          ].map(({ label, name, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{label}</label>
              <input
                {...register(name)}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
              />
            </div>
          ))}
        </div>

        <div className="px-5 pb-8 pt-3 bg-white border-t border-gray-100">
          <button
            type="submit"
            disabled={mut.isPending}
            className="w-full rounded-full py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            {mut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Change Password Sheet ───────────────────────────────────────────────────

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mut = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast("Password changed successfully", "success");
      onClose();
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) { toast("Enter your current password", "error"); return; }
    if (newPassword.length < 6) { toast("New password must be at least 6 characters", "error"); return; }
    if (newPassword !== confirmPassword) { toast("Passwords do not match", "error"); return; }
    mut.mutate();
  }

  const inputClass = "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 pt-14 pb-5" style={{ backgroundColor: BRAND }}>
        <h2 className="text-xl font-bold text-white">Change Password</h2>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" style={{ backgroundColor: "#FAF0F0" }}>
          {[
            { label: "Current Password", value: currentPassword, setter: setCurrentPassword },
            { label: "New Password", value: newPassword, setter: setNewPassword },
            { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword },
          ].map(({ label, value, setter }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
          ))}
        </div>

        <div className="px-5 pb-8 pt-3 bg-white border-t border-gray-100">
          <button
            type="submit"
            disabled={mut.isPending}
            className="w-full rounded-full py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            {mut.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#FAF0F0" }}>
        <Icon className="h-4 w-4" style={{ color: "#999" }} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PortalProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const logoutMut = useLogout();

  const query = useQuery({ queryKey: ["portal-profile"], queryFn: getProfile });

  const photoMut = useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
      toast("Photo updated", "success");
    },
    onError: (err) => toast(extractErrorMessage(err), "error"),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#FAF0F0" }}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const profile = query.data;
  const emp = profile?.employee;
  const fullName = emp ? `${emp.firstName} ${emp.middleName ? emp.middleName[0] + ". " : ""}${emp.lastName}` : profile?.email ?? "";
  const initials = emp
    ? `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase()
    : (profile?.email?.[0] ?? "U").toUpperCase();

  const address = [emp?.address, emp?.city, emp?.province, emp?.zipCode].filter(Boolean).join(", ");

  return (
    <div style={{ backgroundColor: "#FAF0F0" }}>
      {/* Header with photo */}
      <div className="rounded-b-[28px] px-6 pt-14 pb-8 text-center" style={{ backgroundColor: BRAND }}>
        <div className="flex justify-end mb-2">
          <img src="/kaos-logo.svg" alt="KAOS" className="h-8 w-auto brightness-0 invert opacity-60" />
        </div>

        {/* Avatar */}
        <div className="relative inline-block mb-3">
          {emp?.profilePhoto ? (
            <img
              src={emp.profilePhoto}
              alt={fullName}
              className="h-20 w-20 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
              {initials}
            </div>
          )}
          <button
            type="button"
            disabled={photoMut.isPending}
            onClick={() => photoInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md"
          >
            {photoMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: BRAND }} />
            ) : (
              <Camera className="h-3.5 w-3.5" style={{ color: BRAND }} />
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

        <p className="text-white font-bold text-lg">{fullName}</p>
        <p className="text-white/70 text-sm">{emp?.position ?? profile?.role}</p>
      </div>

      <div className="px-4 pt-5 pb-10 space-y-4">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Personal Information</h2>
            <button
              onClick={() => setEditOpen(true)}
              className="text-sm font-medium"
              style={{ color: BRAND }}
            >
              Edit
            </button>
          </div>

          <InfoRow icon={Mail} label="Email" value={profile?.email} />
          <InfoRow icon={Phone} label="Phone" value={emp?.phone} />
          <InfoRow icon={MapPin} label="Address" value={address || null} />
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">Employment Details</h2>

          <InfoRow icon={User} label="Role" value={emp?.position} />
          <InfoRow icon={Building2} label="Branch" value={emp?.branch?.name} />
          <InfoRow icon={CreditCard} label="Employee ID" value={emp?.employeeId} />
          <InfoRow icon={Calendar} label="Join Date" value={emp?.dateHired ? fmtDate(emp.dateHired) : null} />
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#FAF0F0" }}>
                <KeyRound className="h-4 w-4" style={{ color: "#999" }} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Password</p>
                <p className="text-xs text-gray-400">Update your account password</p>
              </div>
            </div>
            <button
              onClick={() => setChangePwOpen(true)}
              className="text-sm font-medium"
              style={{ color: BRAND }}
            >
              Change
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => logoutMut.mutate()}
          disabled={logoutMut.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white"
          style={{ backgroundColor: BRAND }}
        >
          {logoutMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Logout
            </>
          )}
        </button>
      </div>

      {changePwOpen && (
        <ChangePasswordSheet onClose={() => setChangePwOpen(false)} />
      )}

      {editOpen && emp && (
        <EditProfileSheet
          initialValues={{
            phone: emp.phone ?? "",
            address: emp.address ?? "",
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
