import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock, LogOut, RefreshCw, XCircle } from "lucide-react";
import { extractErrorMessage } from "@/lib/api";
import {
  getKioskStatus, kioskClockIn, kioskClockOut, pingKiosk, uploadKioskSelfie,
  type KioskAttendance, type KioskEmployee, type KioskShift, type KioskStatusData,
} from "./kiosk.api";

const PIN_KEY = "kiosk_pin";
const BRAND = "#8C1515";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}


// ─── Screen 1: ID Entry ──────────────────────────────────────────────────────

function IdEntryScreen({
  onLookup, loading, error,
}: { onLookup: (id: string) => void; loading: boolean; error: string }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 gap-6"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/30" />
      <img src="/kaos-logo.svg" alt="KAOS" className="relative z-10 h-20 w-auto brightness-0 invert" />
      <h1 className="relative z-10 text-2xl font-bold text-white tracking-wide">KAOS Attendance</h1>

      <div className="relative z-10 w-full max-w-xs space-y-3 mt-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter ID Number"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onLookup(value.trim())}
          className="w-full rounded-full bg-white px-5 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/40 shadow"
        />
        <button
          onClick={() => value.trim() && onLookup(value.trim())}
          disabled={loading || !value.trim()}
          className="w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "#2D0606" }}
        >
          {loading ? "Looking up…" : "Login"}
        </button>
        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-white/80 pt-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <span className="relative z-10 absolute bottom-6 text-xs text-white/40">v. 0.0.0 - alpha</span>
    </div>
  );
}

// ─── Screen 2: Main (Shift + Camera) ─────────────────────────────────────────

function ShiftCard({
  shift, attendance, lastClockIn,
}: { shift: KioskShift | null; attendance: KioskAttendance | null; lastClockIn: { date: string; clockIn: string } | null }) {
  const isClockedIn = !!attendance && !attendance.clockOut;
  const isDone = !!attendance?.clockOut;

  const badgeStyle = isDone
    ? { backgroundColor: "#D4EDDA", color: "#1A7F40" }
    : isClockedIn
    ? { backgroundColor: "#FFF3CD", color: "#856404" }
    : { backgroundColor: "#E2E2E2", color: "#555" };

  const badgeLabel = isDone ? "Timed Out" : isClockedIn ? "Timed In" : "Not Yet Timed In";

  return (
    <div className="rounded-2xl bg-white shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between">
        <h2 className="font-bold text-gray-900 text-base">Today's Shift</h2>
        <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={badgeStyle}>
          {badgeLabel}
        </span>
      </div>
      {shift ? (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium">{shift.startTime} – {shift.endTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{shift.name}</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No shift scheduled for today.</p>
      )}
      <hr className="border-gray-100" />
      <p className="text-xs text-gray-400">
        {lastClockIn
          ? `Last clock-in: ${fmtDate(lastClockIn.date)} at ${fmtTime(lastClockIn.clockIn)}`
          : isClockedIn
          ? `Clocked in at ${fmtTime(attendance!.clockIn)}`
          : "No previous clock-in on record"}
      </p>
    </div>
  );
}

function CameraView({
  videoRef, onCapture, isClockedIn,
}: { videoRef: React.RefObject<HTMLVideoElement | null>; onCapture: () => void; isClockedIn: boolean }) {
  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-900 text-base">Photo Attendance</h2>
      <div className="rounded-2xl bg-white shadow-sm p-4 space-y-3">
        <p className="text-center text-xs text-gray-400">Center your face in the frame</p>
        <div className="relative overflow-hidden rounded-xl bg-gray-900" style={{ aspectRatio: "4/3" }}>
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
        <button
          onClick={onCapture}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow"
          style={{ backgroundColor: isClockedIn ? "#EF4444" : "#22C55E" }}
        >
          <Clock className="h-4 w-4" />
          {isClockedIn ? "Time Out" : "Time In"}
        </button>
      </div>
    </div>
  );
}

function MainScreen({
  statusData, videoRef, onCapture, onLogout,
}: {
  statusData: KioskStatusData;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onLogout: () => void;
}) {
  const { employee, shift, attendance, lastClockIn } = statusData;
  const isClockedIn = !!attendance && !attendance.clockOut;
  const isDone = !!attendance?.clockOut;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF0F0" }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-6 flex items-start justify-between" style={{ backgroundColor: BRAND }}>
        <div>
          <p className="text-white/80 text-sm">{greeting()},</p>
          <p className="text-white font-bold text-xl">{employee.firstName} {employee.lastName[0]}. {employee.lastName.slice(0)}</p>
        </div>
        <img src="/kaos-logo.svg" alt="KAOS" className="h-9 w-auto brightness-0 invert opacity-80 mt-1" />
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-4">
        <ShiftCard shift={shift} attendance={attendance} lastClockIn={lastClockIn} />

        {!isDone ? (
          <CameraView videoRef={videoRef} onCapture={onCapture} isClockedIn={isClockedIn} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm p-5 text-center space-y-1">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <p className="font-semibold text-gray-800">Shift complete</p>
            <p className="text-xs text-gray-400">
              In {fmtTime(attendance!.clockIn)} · Out {fmtTime(attendance!.clockOut!)}
            </p>
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow mt-2"
          style={{ backgroundColor: BRAND }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Screen 3: Photo Confirmation ────────────────────────────────────────────

function ConfirmScreen({
  employee, photoUrl, isClockedIn, onRetake, onConfirm, loading,
}: {
  employee: KioskEmployee;
  photoUrl: string;
  isClockedIn: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF0F0" }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-6 flex items-start justify-between" style={{ backgroundColor: BRAND }}>
        <div>
          <p className="text-white/80 text-sm">{greeting()},</p>
          <p className="text-white font-bold text-xl">{employee.firstName} {employee.lastName}</p>
        </div>
        <img src="/kaos-logo.svg" alt="KAOS" className="h-9 w-auto brightness-0 invert opacity-80 mt-1" />
      </div>

      {/* Card */}
      <div className="flex-1 px-4 py-5">
        <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
          <div className="text-center">
            <h2 className="font-bold text-gray-900 text-base">Confirm Your Photo</h2>
            <p className="text-xs text-gray-400">Review before submitting</p>
          </div>

          <div className="overflow-hidden rounded-xl" style={{ aspectRatio: "4/3" }}>
            <img src={photoUrl} alt="Selfie" className="h-full w-full object-cover" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={onRetake}
              disabled={loading}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Employee details */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-lg text-gray-900">
              <span className="font-bold">{employee.lastName},</span> {employee.firstName}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Action</p>
                <span
                  className="inline-block mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={isClockedIn
                    ? { backgroundColor: "#FEE2E2", color: "#991B1B" }
                    : { backgroundColor: "#DCFCE7", color: "#166534" }}
                >
                  {isClockedIn ? "Time Out" : "Time In"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Branch</p>
                <p className="font-medium text-gray-800 mt-0.5">{employee.branch.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
                <p className="font-medium text-gray-800 mt-0.5">{timeStr}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow"
          style={{ backgroundColor: BRAND }}
          onClick={onRetake}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Screen 4: Success ───────────────────────────────────────────────────────

function SuccessScreen({ isClockedIn, recordedTime, onReturnNow }: { isClockedIn: boolean; recordedTime: string; onReturnNow: () => void }) {
  const [seconds, setSeconds] = useState(5);

  // Tick the countdown
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Redirect when countdown hits zero — separate effect, never called during render
  useEffect(() => {
    if (seconds === 0) onReturnNow();
  }, [seconds, onReturnNow]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 bg-white gap-5">
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
        <CheckCircle2 className="h-5 w-5" />
        Time Recorded
      </div>

      <div className="text-5xl font-bold tabular-nums" style={{ color: BRAND }}>
        {recordedTime}
      </div>

      <p className="text-gray-500 text-sm">{isClockedIn ? "Have a great shift!" : "Have a great rest!"}</p>

      <hr className="w-full border-gray-100" />

      <p className="text-sm text-gray-400 text-center">
        Returning to login screen in <span className="font-bold text-gray-700">{seconds}</span> seconds
      </p>

      <button onClick={onReturnNow} className="text-sm font-semibold underline text-gray-700 hover:text-gray-900">
        Return to Login Now
      </button>
    </div>
  );
}

// ─── Blocked / PIN Setup ──────────────────────────────────────────────────────

function BlockedScreen() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 px-6"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/40" />
      <XCircle className="relative z-10 h-16 w-16 text-white/60" />
      <h1 className="relative z-10 text-xl font-bold text-white">Unauthorized Terminal</h1>
      <p className="relative z-10 text-sm text-white/60 text-center max-w-xs">
        This device is not authorized to access the kiosk. Please contact your administrator.
      </p>
    </div>
  );
}

function PinSetupScreen({ onDone }: { onDone: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  function submit() {
    if (pin.trim().length < 4) { setError("PIN must be at least 4 characters"); return; }
    localStorage.setItem(PIN_KEY, pin.trim());
    onDone(pin.trim());
  }
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-8 gap-6"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/35" />
      <img src="/kaos-logo.svg" alt="KAOS" className="relative z-10 h-16 brightness-0 invert" />
      <h1 className="relative z-10 text-xl font-bold text-white">Kiosk Setup</h1>
      <p className="relative z-10 text-sm text-white/60 text-center max-w-xs">
        Enter the kiosk PIN set by your administrator. It will be saved on this device.
      </p>
      <div className="relative z-10 w-full max-w-xs space-y-3">
        <input
          type="password" placeholder="Enter kiosk PIN" value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full rounded-full bg-white px-5 py-3 text-center text-sm text-gray-700 placeholder-gray-400 outline-none"
        />
        {error && <p className="text-center text-xs text-red-300">{error}</p>}
        <button onClick={submit} className="w-full rounded-full bg-white/20 py-3 text-sm font-medium text-white hover:bg-white/30">
          Confirm PIN
        </button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Screen = "loading" | "blocked" | "pin-setup" | "id-entry" | "main" | "confirm" | "success";

export default function KioskPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [pin, setPin] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [statusData, setStatusData] = useState<KioskStatusData | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [actionWasClockIn, setActionWasClockIn] = useState(false);
  const [recordedTime, setRecordedTime] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      // Camera unavailable — proceed without selfie
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    pingKiosk()
      .then(() => {
        const saved = localStorage.getItem(PIN_KEY) ?? "";
        if (saved) { setPin(saved); setScreen("id-entry"); }
        else setScreen("pin-setup");
      })
      .catch(() => setScreen("blocked"));
  }, []);

  useEffect(() => {
    if (screen === "main") startCamera();
    else stopCamera();
  }, [screen, startCamera, stopCamera]);

  async function handleLookup(empId: string) {
    setLookupLoading(true);
    setLookupError("");
    try {
      const data = await getKioskStatus(empId, pin);
      setStatusData(data);
      setScreen("main");
    } catch (err) {
      setLookupError(extractErrorMessage(err, "Employee not found"));
    } finally {
      setLookupLoading(false);
    }
  }

  function handleCapture() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPhotoBlob(blob);
      setPhotoUrl(URL.createObjectURL(blob));
      const isClockedIn = !!statusData?.attendance && !statusData.attendance.clockOut;
      setActionWasClockIn(!isClockedIn);
      setScreen("confirm");
    }, "image/jpeg", 0.85);
  }

  async function handleConfirm() {
    if (!statusData) return;
    setConfirmLoading(true);
    try {
      let selfieUrl: string | undefined;
      if (photoBlob) {
        selfieUrl = await uploadKioskSelfie(photoBlob, pin);
      }

      const isClockedIn = !!statusData.attendance && !statusData.attendance.clockOut;
      if (isClockedIn && statusData.attendance) {
        await kioskClockOut(statusData.attendance.id, selfieUrl, pin);
      } else {
        await kioskClockIn(statusData.employee.employeeId, selfieUrl, pin);
      }
      setRecordedTime(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
      setScreen("success");
    } catch {
      // On error go back to main
      setScreen("main");
    } finally {
      setConfirmLoading(false);
    }
  }

  function handleLogout() {
    setStatusData(null);
    setPhotoBlob(null);
    setPhotoUrl("");
    setScreen("id-entry");
  }

  const handleReturnNow = useCallback(() => {
    setStatusData(null);
    setPhotoBlob(null);
    setPhotoUrl("");
    setScreen("id-entry");
  }, []);

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: BRAND }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }
  if (screen === "blocked") return <BlockedScreen />;
  if (screen === "pin-setup") return <PinSetupScreen onDone={(p) => { setPin(p); setScreen("id-entry"); }} />;
  if (screen === "id-entry") {
    return <IdEntryScreen onLookup={handleLookup} loading={lookupLoading} error={lookupError} />;
  }
  if (screen === "main" && statusData) {
    return (
      <MainScreen
        statusData={statusData}
        videoRef={videoRef}
        onCapture={handleCapture}
        onLogout={handleLogout}
      />
    );
  }
  if (screen === "confirm" && statusData && photoUrl) {
    const isClockedIn = !!statusData.attendance && !statusData.attendance.clockOut;
    return (
      <ConfirmScreen
        employee={statusData.employee}
        photoUrl={photoUrl}
        isClockedIn={isClockedIn}
        onRetake={() => setScreen("main")}
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    );
  }
  if (screen === "success") {
    return <SuccessScreen isClockedIn={actionWasClockIn} recordedTime={recordedTime} onReturnNow={handleReturnNow} />;
  }

  return null;
}
