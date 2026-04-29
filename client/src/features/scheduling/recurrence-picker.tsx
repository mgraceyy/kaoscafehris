import { addDays, addMonths, addWeeks, format } from "date-fns";

export type RepeatUnit = "day" | "week" | "month";
export type EndsMode = "never" | "on" | "after";

export interface RecurrenceConfig {
  repeatEvery: number;
  repeatUnit: RepeatUnit;
  daysOfWeek: number[]; // 0=Sun … 6=Sat, only used when repeatUnit==="week"
  endsMode: EndsMode;
  endsOnDate: string; // yyyy-MM-dd
  endsAfter: number; // occurrences
}

export function defaultRecurrence(startDate: string): RecurrenceConfig {
  return {
    repeatEvery: 1,
    repeatUnit: "week",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
    endsMode: "on",
    endsOnDate: startDate,
    endsAfter: 13,
  };
}

const MAX_OCCURRENCES = 366;

export function expandRecurrenceDates(start: string, cfg: RecurrenceConfig): string[] {
  if (!start) return [];

  const startDate = new Date(start + "T00:00:00");
  const results: string[] = [];

  if (cfg.repeatUnit === "week") {
    const endDate =
      cfg.endsMode === "on" ? new Date(cfg.endsOnDate + "T00:00:00") : null;
    const maxCount =
      cfg.endsMode === "after"
        ? cfg.endsAfter
        : MAX_OCCURRENCES;

    let blockStart = startDate;

    let safetyBreak = 0;
    while (results.length < maxCount && safetyBreak < 10000) {
      safetyBreak++;
      // Generate days within this week block (Sun–Sat of blockStart's week)
      const blockSun = addDays(blockStart, -blockStart.getDay()); // Sunday of this week

      for (let d = 0; d < 7; d++) {
        const candidate = addDays(blockSun, d);
        if (candidate < startDate) continue;
        if (!cfg.daysOfWeek.includes(d)) continue;
        if (endDate && candidate > endDate) {
          return results;
        }
        results.push(format(candidate, "yyyy-MM-dd"));
        if (results.length >= maxCount) return results;
      }

      // Advance by repeatEvery weeks to next block
      blockStart = addWeeks(addDays(blockSun, 7), cfg.repeatEvery - 1);
    }

    return results;
  }

  if (cfg.repeatUnit === "day") {
    let cursor = startDate;
    const endDate =
      cfg.endsMode === "on" ? new Date(cfg.endsOnDate + "T00:00:00") : null;
    const maxCount = cfg.endsMode === "after" ? cfg.endsAfter : MAX_OCCURRENCES;

    while (results.length < maxCount) {
      if (endDate && cursor > endDate) break;
      results.push(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, cfg.repeatEvery);
    }
    return results;
  }

  if (cfg.repeatUnit === "month") {
    let cursor = startDate;
    const endDate =
      cfg.endsMode === "on" ? new Date(cfg.endsOnDate + "T00:00:00") : null;
    const maxCount = cfg.endsMode === "after" ? cfg.endsAfter : MAX_OCCURRENCES;

    while (results.length < maxCount) {
      if (endDate && cursor > endDate) break;
      results.push(format(cursor, "yyyy-MM-dd"));
      cursor = addMonths(cursor, cfg.repeatEvery);
    }
    return results;
  }

  return results;
}

// ─── UI Component ────────────────────────────────────────────────────────────

interface Props {
  value: RecurrenceConfig;
  onChange: (cfg: RecurrenceConfig) => void;
  startDate: string;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function RecurrencePicker({ value, onChange, startDate }: Props) {
  const set = <K extends keyof RecurrenceConfig>(key: K, val: RecurrenceConfig[K]) =>
    onChange({ ...value, [key]: val });

  function toggleDay(d: number) {
    const next = value.daysOfWeek.includes(d)
      ? value.daysOfWeek.filter((x) => x !== d)
      : [...value.daysOfWeek, d].sort();
    set("daysOfWeek", next);
  }

  const preview = expandRecurrenceDates(startDate, value);
  const cappedMsg =
    value.endsMode === "never" && preview.length >= MAX_OCCURRENCES
      ? ` (capped at ${MAX_OCCURRENCES})`
      : "";

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      {/* Repeat every */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium whitespace-nowrap">Repeat every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={value.repeatEvery}
          onChange={(e) => set("repeatEvery", Math.max(1, Number(e.target.value)))}
          className="w-16 rounded-md border bg-background px-2 py-1 text-sm text-center"
        />
        <select
          value={value.repeatUnit}
          onChange={(e) => set("repeatUnit", e.target.value as RepeatUnit)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="day">day{value.repeatEvery > 1 ? "s" : ""}</option>
          <option value="week">week{value.repeatEvery > 1 ? "s" : ""}</option>
          <option value="month">month{value.repeatEvery > 1 ? "s" : ""}</option>
        </select>
      </div>

      {/* Days of week — only for weekly */}
      {value.repeatUnit === "week" && (
        <div className="space-y-1">
          <span className="text-sm font-medium">Repeat on</span>
          <div className="flex gap-1 pt-1">
            {DAY_LABELS.map((label, i) => {
              const active = value.daysOfWeek.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ends */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Ends</span>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="endsMode"
            checked={value.endsMode === "never"}
            onChange={() => set("endsMode", "never")}
          />
          Never
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="endsMode"
            checked={value.endsMode === "on"}
            onChange={() => set("endsMode", "on")}
          />
          On
          <input
            type="date"
            value={value.endsOnDate}
            min={startDate}
            onChange={(e) => {
              set("endsOnDate", e.target.value);
              if (value.endsMode !== "on") set("endsMode", "on");
            }}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="endsMode"
            checked={value.endsMode === "after"}
            onChange={() => set("endsMode", "after")}
          />
          After
          <input
            type="number"
            min={1}
            max={MAX_OCCURRENCES}
            value={value.endsAfter}
            onChange={(e) => {
              set("endsAfter", Math.max(1, Math.min(MAX_OCCURRENCES, Number(e.target.value))));
              if (value.endsMode !== "after") set("endsMode", "after");
            }}
            className="w-16 rounded-md border bg-background px-2 py-1 text-sm text-center"
          />
          <span className="text-muted-foreground">occurrences</span>
        </label>
      </div>

      {/* Preview */}
      {startDate && (
        <p className="text-xs text-muted-foreground">
          {preview.length === 0
            ? "No dates match this recurrence."
            : `${preview.length} shift${preview.length !== 1 ? "s" : ""} will be created${cappedMsg}.`}
        </p>
      )}
    </div>
  );
}
