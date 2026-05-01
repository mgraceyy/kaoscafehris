import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;          // "HH:mm"
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10 … 55

function parseHHMM(value?: string): { h: number; m: number; period: "AM" | "PM" } {
  if (!value) return { h: 12, m: 0, period: "AM" };
  const [hStr, mStr] = value.split(":");
  const totalH = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = totalH < 12 ? "AM" : "PM";
  const h = totalH % 12 || 12;
  return { h, m, period };
}

function toHHMM(h: number, m: number, period: "AM" | "PM"): string {
  let hour24 = h % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface DropdownPos { top: number; left: number; width: number; openUp: boolean }

const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  ({ value, onChange, disabled, id, className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [pos, setPos] = React.useState<DropdownPos | null>(null);
    const [hour, setHour] = React.useState<number>(() => parseHHMM(value).h);
    const [minute, setMinute] = React.useState<number>(() => parseHHMM(value).m);
    const [period, setPeriod] = React.useState<"AM" | "PM">(() => parseHHMM(value).period);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Merge forwarded ref with internal ref.
    React.useImperativeHandle(ref, () => triggerRef.current!);

    // Sync internal state when controlled value changes.
    React.useEffect(() => {
      const p = parseHHMM(value);
      setHour(p.h);
      setMinute(p.m);
      setPeriod(p.period);
    }, [value]);

    // Close on outside click.
    React.useEffect(() => {
      if (!open) return;
      function handler(e: MouseEvent) {
        const target = e.target as Node;
        if (
          triggerRef.current?.contains(target) ||
          dropdownRef.current?.contains(target)
        ) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Scroll selected items into view when dropdown opens.
    React.useEffect(() => {
      if (!open || !dropdownRef.current) return;
      dropdownRef.current.querySelectorAll("[data-selected]").forEach((el) => {
        (el as HTMLElement).scrollIntoView({ block: "nearest" });
      });
    }, [open]);

    function openDropdown() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const openUp = false;
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      });
      setOpen(true);
    }

    function emit(h: number, m: number, p: "AM" | "PM") {
      onChange?.(toHHMM(h, m, p));
    }

    function selectHour(h: number) { setHour(h); emit(h, minute, period); }
    function selectMinute(m: number) { setMinute(m); emit(hour, m, period); }
    function selectPeriod(p: "AM" | "PM") { setPeriod(p); emit(hour, minute, p); }

    const displayValue = value
      ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`
      : "Select time";

    const dropdown = open && pos
      ? ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className="rounded-md border bg-white shadow-lg"
          >
            <div className="flex divide-x" style={{ maxHeight: 200 }}>
              {/* Hours */}
              <div className="flex-1 overflow-y-auto py-1">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-selected={h === hour ? "" : undefined}
                    onClick={() => selectHour(h)}
                    className={cn(
                      "w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors",
                      h === hour && "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    )}
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                ))}
              </div>

              {/* Minutes */}
              <div className="flex-1 overflow-y-auto py-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-selected={m === minute ? "" : undefined}
                    onClick={() => selectMinute(m)}
                    className={cn(
                      "w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors",
                      m === minute && "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>

              {/* AM / PM */}
              <div className="flex flex-col py-1">
                {(["AM", "PM"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { selectPeriod(p); setOpen(false); }}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors",
                      p === period && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

    return (
      <div className={cn("relative", className)}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openDropdown())}
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            value ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="flex-1 text-left tabular-nums">{displayValue}</span>
          <svg className="h-4 w-4 opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
        {dropdown}
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";
export { TimePicker };
