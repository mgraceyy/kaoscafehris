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
const MINUTES = Array.from({ length: 60 }, (_, i) => i);   // 0–59

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

function parseTypedTime(text: string, fallbackPeriod: "AM" | "PM"): { h: number; m: number; p: "AM" | "PM" } | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const p = (match[3]?.toUpperCase() as "AM" | "PM") ?? fallbackPeriod;
  if (h < 1 || h > 12 || m < 0 || m > 59) return null;
  return { h, m, p };
}

interface DropdownPos { top: number; left: number; width: number }

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  ({ value, onChange, disabled, id, className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [pos, setPos] = React.useState<DropdownPos | null>(null);
    const [hour, setHour] = React.useState<number>(() => parseHHMM(value).h);
    const [minute, setMinute] = React.useState<number>(() => parseHHMM(value).m);
    const [period, setPeriod] = React.useState<"AM" | "PM">(() => parseHHMM(value).period);
    const [inputText, setInputText] = React.useState<string>("");
    const [isEditing, setIsEditing] = React.useState(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    // Sync internal state when controlled value changes.
    React.useEffect(() => {
      const p = parseHHMM(value);
      setHour(p.h);
      setMinute(p.m);
      setPeriod(p.period);
    }, [value]);

    // Close dropdown on outside click.
    React.useEffect(() => {
      if (!open) return;
      function handler(e: MouseEvent) {
        const target = e.target as Node;
        if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
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
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      setOpen(true);
    }

    function emit(h: number, m: number, p: "AM" | "PM") {
      onChange?.(toHHMM(h, m, p));
    }

    function selectHour(h: number) { setHour(h); emit(h, minute, period); }
    function selectMinute(m: number) { setMinute(m); emit(hour, m, period); }
    function selectPeriod(p: "AM" | "PM") { setPeriod(p); emit(hour, minute, p); setOpen(false); }

    function handleFocus() {
      setInputText(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`);
      setIsEditing(true);
    }

    function commitInput(text: string) {
      const parsed = parseTypedTime(text, period);
      if (parsed) {
        setHour(parsed.h);
        setMinute(parsed.m);
        setPeriod(parsed.p);
        emit(parsed.h, parsed.m, parsed.p);
      }
      setIsEditing(false);
    }

    function handleBlur() {
      commitInput(inputText);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") { e.preventDefault(); commitInput(inputText); inputRef.current?.blur(); }
      if (e.key === "Escape") { setIsEditing(false); inputRef.current?.blur(); }
    }

    const displayValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;

    const dropdown = open && pos
      ? ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 160, zIndex: 9999 }}
            className="rounded-md border bg-white shadow-lg"
          >
            <div className="flex divide-x" style={{ height: 160 }}>
              {/* Hours */}
              <div className="flex-1 overflow-y-auto">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-selected={h === hour ? "" : undefined}
                    onClick={() => selectHour(h)}
                    className={cn(
                      "w-full px-2 py-1 text-xs text-center hover:bg-muted transition-colors",
                      h === hour && "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    )}
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                ))}
              </div>

              {/* Minutes */}
              <div className="flex-1 overflow-y-auto">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-selected={m === minute ? "" : undefined}
                    onClick={() => selectMinute(m)}
                    className={cn(
                      "w-full px-2 py-1 text-xs text-center hover:bg-muted transition-colors",
                      m === minute && "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </div>

              {/* AM / PM */}
              <div className="flex flex-col justify-center">
                {(["AM", "PM"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => selectPeriod(p)}
                    className={cn(
                      "px-2 py-1.5 text-xs font-medium hover:bg-muted transition-colors",
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
      <div ref={wrapperRef} className={cn("relative flex h-10 w-full items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", disabled && "cursor-not-allowed opacity-50", className)}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          placeholder="hh:mm AM/PM"
          value={isEditing ? inputText : displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent px-3 py-2 text-sm tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            // Prevent the input from losing focus and triggering blur commit prematurely.
            e.preventDefault();
            open ? setOpen(false) : openDropdown();
          }}
          className="px-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
          tabIndex={-1}
        >
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
