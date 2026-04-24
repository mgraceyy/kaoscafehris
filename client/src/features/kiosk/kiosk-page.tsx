import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Clock, LogOut, RefreshCw, User, XCircle } from "lucide-react";
import { extractErrorMessage } from "@/lib/api";
import {
  getKioskStatus, kioskClockIn, kioskClockOut, pingKiosk, uploadKioskSelfie,
  type KioskAttendance, type KioskEmployee, type KioskShift, type KioskStatusData,
} from "./kiosk.api";

const PIN_KEY    = "kiosk_pin";
const BRAND      = "#811c12";
const DARK       = "#280906";
const BLUSH      = "#f7ebeb";
const ROSE       = "#a28587";
const NEAR_BLACK = "#110200";

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

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Shared header ────────────────────────────────────────────────────────────

function KioskHeader({ name }: { name: string }) {
  const now = useLiveClock();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div style={{ background: `linear-gradient(160deg, ${DARK} 0%, ${BRAND} 100%)`, padding: "22px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{greeting()},</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: -0.3, marginTop: 1 }}>{name}</div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color="rgba(255,255,255,0.5)" />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              {timeStr} · {dateStr}
            </span>
          </div>
        </div>
        <img src="/kaos-logo.svg" alt="KAOS" style={{ height: 40, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.9 }} />
      </div>
    </div>
  );
}

// ─── Screen 1: ID Entry ──────────────────────────────────────────────────────

function IdEntryScreen({
  onLookup, loading, error,
}: { onLookup: (id: string) => void; loading: boolean; error: string }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", overflow: "hidden", minHeight: "100vh" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 36px", gap: 0 }}>
        <img src="/kaos-logo.svg" alt="KAOS" style={{ height: 68, width: "auto", filter: "brightness(0) invert(1)" }} />
        <div style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginTop: 10, letterSpacing: 0.2, textAlign: "center" }}>KAOS Café Daily Time Record</div>

        <div style={{ width: "100%", marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter ID Number"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && onLookup(value.trim())}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 40,
              border: "none", background: "rgba(255,255,255,0.92)",
              color: "#333", fontSize: 14, outline: "none", letterSpacing: 0.5,
            }}
          />
          <button
            onClick={() => value.trim() && onLookup(value.trim())}
            disabled={loading || !value.trim()}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 40,
              border: "none", background: DARK,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: loading || !value.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Looking up…" : "Login"}
          </button>
        </div>

        <div style={{ marginTop: 20, minHeight: 22, display: "flex", alignItems: "center", gap: 6, opacity: error ? 1 : 0, transition: "opacity .25s" }}>
          <AlertCircle size={13} color="rgba(255,255,255,0.75)" />
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>{error || "ID does not exist"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Main (Shift + Camera) ─────────────────────────────────────────

function ShiftCard({
  shift, attendance, lastClockIn,
}: { shift: KioskShift | null; attendance: KioskAttendance | null; lastClockIn: { date: string; clockIn: string } | null }) {
  const isClockedIn = !!attendance && !attendance.clockOut;
  const isDone = !!attendance?.clockOut;

  const badge = isDone
    ? { bg: "#dcfce7", color: "#15803d", label: "Timed Out" }
    : isClockedIn
    ? { bg: "#fef3c7", color: "#92400e", label: "Timed In" }
    : { bg: "#fdf0e0", color: "#a06010", label: "Not Yet Timed In" };

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 10px rgba(140,21,21,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: NEAR_BLACK }}>Today's Shift</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, background: badge.bg, color: badge.color, borderRadius: 20, padding: "4px 12px", letterSpacing: 0.3 }}>
          {badge.label}
        </span>
      </div>
      {shift ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Clock size={14} color={ROSE} />
            <span style={{ fontSize: 13.5, color: "#222", fontWeight: 600 }}>{shift.startTime} – {shift.endTime}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Building2 size={14} color={ROSE} />
            <span style={{ fontSize: 13, color: "#555" }}>{shift.name}</span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "#999", marginBottom: 10 }}>No shift scheduled for today.</p>
      )}
      <div style={{ borderTop: "1px solid #f0e6e6", paddingTop: 10, fontSize: 12, color: "#aaa" }}>
        {lastClockIn
          ? `Last clock-in: ${fmtDate(lastClockIn.date)} at ${fmtTime(lastClockIn.clockIn)}`
          : isClockedIn
          ? `Clocked in at ${fmtTime(attendance!.clockIn)}`
          : "No previous clock-in on record"}
      </div>
    </div>
  );
}

function CameraView({
  videoRef, onCapture, isClockedIn,
}: { videoRef: React.RefObject<HTMLVideoElement | null>; onCapture: () => void; isClockedIn: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: NEAR_BLACK, marginBottom: 10 }}>Photo Attendance</div>

      <div style={{ borderRadius: 18, overflow: "hidden", position: "relative", background: NEAR_BLACK, aspectRatio: "3/4" }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {/* Face guide oval */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{
            width: 160, height: 200,
            border: "2px solid rgba(255,255,255,0.35)",
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
          }} />
        </div>
        <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", background: "rgba(0,0,0,0.35)", borderRadius: 20, padding: "4px 14px" }}>
            Center your face in the frame
          </span>
        </div>
      </div>

      <button
        onClick={onCapture}
        style={{
          width: "100%", marginTop: 12, padding: "16px", borderRadius: 14,
          background: isClockedIn ? "#b91c1c" : "#2d7a3a", border: "none",
          color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: isClockedIn ? "0 4px 14px rgba(185,28,28,0.3)" : "0 4px 14px rgba(45,122,58,0.3)",
        }}
      >
        <Clock size={18} color="#fff" />
        {isClockedIn ? "Time Out" : "Time In"}
      </button>
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BLUSH, fontFamily: "'Inter', sans-serif" }}>
      <KioskHeader name={`${employee.firstName} ${employee.lastName}`} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 12px" }}>
        <div style={{ marginBottom: 14 }}>
          <ShiftCard shift={shift} attendance={attendance} lastClockIn={lastClockIn} />
        </div>

        {!isDone ? (
          <div style={{ marginBottom: 14 }}>
            <CameraView videoRef={videoRef} onCapture={onCapture} isClockedIn={isClockedIn} />
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px", textAlign: "center", marginBottom: 14, boxShadow: "0 2px 10px rgba(140,21,21,0.07)" }}>
            <CheckCircle2 size={40} color="#15803d" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontWeight: 600, color: NEAR_BLACK }}>Shift complete</p>
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              In {fmtTime(attendance!.clockIn)} · Out {fmtTime(attendance!.clockOut!)}
            </p>
          </div>
        )}

        <div style={{ textAlign: "center", paddingBottom: 8 }}>
          <button
            onClick={onLogout}
            style={{ background: "none", border: "none", color: ROSE, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}
          >
            <LogOut size={13} color={ROSE} />
            Not you? Switch employee
          </button>
        </div>
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
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const actionBadge = isClockedIn
    ? { bg: "#fee2e2", color: "#991b1b", label: "Time Out" }
    : { bg: "#dcfce7", color: "#166534", label: "Time In" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BLUSH, fontFamily: "'Inter', sans-serif" }}>
      <KioskHeader name={`${employee.firstName} ${employee.lastName}`} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "20px", boxShadow: "0 2px 12px rgba(140,21,21,0.08)" }}>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: NEAR_BLACK }}>Confirm Your Photo</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>Review carefully before submitting</div>
          </div>

          <div style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "4/3", marginBottom: 16 }}>
            <img src={photoUrl} alt="Selfie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <button
              onClick={onRetake}
              disabled={loading}
              style={{
                flex: 1, padding: "13px", borderRadius: 12, border: "1.5px solid #ddd",
                background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw size={15} color="#888" /> Retake
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1.4, padding: "13px", borderRadius: 12, border: "none",
                background: "#2d7a3a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: "0 3px 10px rgba(45,122,58,0.25)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CheckCircle2 size={15} color="#fff" />
              )}
              {loading ? "Saving…" : isClockedIn ? "Confirm Time Out" : "Confirm Time In"}
            </button>
          </div>

          <div style={{ borderTop: "1px solid #f0e6e6", paddingTop: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NEAR_BLACK, marginBottom: 10 }}>
              <span style={{ fontWeight: 900 }}>{employee.lastName},</span> {employee.firstName}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              <div>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 3 }}>Action</div>
                <span style={{ display: "inline-block", background: actionBadge.bg, color: actionBadge.color, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 12px" }}>
                  {actionBadge.label}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 3 }}>Branch</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: NEAR_BLACK }}>{employee.branch.name}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 3 }}>Time</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: NEAR_BLACK, fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 3 }}>Date</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: NEAR_BLACK }}>{dateStr}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            onClick={onRetake}
            style={{ background: "none", border: "none", color: ROSE, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <LogOut size={12} color={ROSE} /> Cancel & switch employee
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Success ───────────────────────────────────────────────────────

function SuccessScreen({
  actionWasClockIn, recordedTime, statusData, onReturnNow,
}: {
  actionWasClockIn: boolean;
  recordedTime: string;
  statusData: KioskStatusData;
  onReturnNow: () => void;
}) {
  const [seconds, setSeconds] = useState(5);
  const now = useLiveClock();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (seconds === 0) onReturnNow();
  }, [seconds, onReturnNow]);

  const { employee, shift } = statusData;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: `linear-gradient(160deg, ${DARK} 0%, ${BRAND} 55%, #a01818 100%)`,
      fontFamily: "'Inter', sans-serif", overflow: "hidden",
    }}>
      <div style={{ padding: "28px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src="/kaos-logo.svg" alt="KAOS" style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>{timeStr} · {dateStr}</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", gap: 6 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, border: "2px solid rgba(255,255,255,0.25)" }}>
          <CheckCircle2 size={40} color="#fff" />
        </div>

        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>Time Recorded</div>
        <div style={{ color: "#fff", fontSize: 44, fontWeight: 900, letterSpacing: -1, fontVariantNumeric: "tabular-nums" }}>{recordedTime}</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>

        <div style={{ marginTop: 20, background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px 22px", width: "100%", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Shift Summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shift && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={14} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 13.5, color: "#fff", fontWeight: 600 }}>{shift.startTime} – {shift.endTime}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={14} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{employee.branch.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <User size={14} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{employee.firstName} {employee.lastName}</span>
            </div>
          </div>
        </div>

        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 12, textAlign: "center" }}>
          {actionWasClockIn ? `Have a great shift, ${employee.firstName}! ☕` : `Have a great rest, ${employee.firstName}!`}
        </div>
      </div>

      <div style={{ padding: "0 28px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
          Returning to login in{" "}
          <span style={{ fontWeight: 800, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums" }}>{seconds}</span>
          {" "}seconds
        </div>
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "rgba(255,255,255,0.5)", borderRadius: 4, width: `${(seconds / 5) * 100}%`, transition: "width 1s linear" }} />
        </div>
        <button
          onClick={onReturnNow}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "9px 22px", color: "rgba(255,255,255,0.7)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          Return to Login Now
        </button>
      </div>
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

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      // Camera unavailable — proceed without selfie
    }
  }, []);

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
      if (photoBlob) selfieUrl = await uploadKioskSelfie(photoBlob, pin);
      const isClockedIn = !!statusData.attendance && !statusData.attendance.clockOut;
      if (isClockedIn && statusData.attendance) {
        await kioskClockOut(statusData.attendance.id, selfieUrl, pin);
      } else {
        await kioskClockIn(statusData.employee.employeeId, selfieUrl, pin);
      }
      setRecordedTime(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      );
      setScreen("success");
    } catch {
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
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: `linear-gradient(160deg, ${DARK} 0%, ${BRAND} 100%)` }}>
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
    return <MainScreen statusData={statusData} videoRef={videoRef} onCapture={handleCapture} onLogout={handleLogout} />;
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
  if (screen === "success" && statusData) {
    return (
      <SuccessScreen
        actionWasClockIn={actionWasClockIn}
        recordedTime={recordedTime}
        statusData={statusData}
        onReturnNow={handleReturnNow}
      />
    );
  }

  return null;
}
