import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/api";
import { formatTime, getMySchedule } from "./portal.api";

function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay(); // 0 = Sun
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MySchedulePage() {
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(new Date()));
  const rangeStart = anchor;
  const rangeEnd = addDays(anchor, 6);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor]
  );

  const query = useQuery({
    queryKey: ["portal-schedule", ymd(rangeStart), ymd(rangeEnd)],
    queryFn: () =>
      getMySchedule({ startDate: ymd(rangeStart), endDate: ymd(rangeEnd) }),
  });

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, typeof query.data>();
    for (const s of query.data ?? []) {
      const key = s.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [query.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My schedule</h1>
          <p className="text-sm text-muted-foreground">
            Your published shifts for the selected week.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(addDays(anchor, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(startOfWeek(new Date()))}
          >
            This week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(addDays(anchor, 7))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground tabular-nums">
        {ymd(rangeStart)} → {ymd(rangeEnd)}
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-destructive">
          {extractErrorMessage(query.error, "Failed to load schedule")}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => {
            const key = ymd(d);
            const shifts = shiftsByDay.get(key) ?? [];
            const isToday = ymd(new Date()) === key;
            return (
              <div
                key={key}
                className={
                  "rounded-lg border bg-card p-3 min-h-[120px] " +
                  (isToday ? "ring-2 ring-primary/40" : "")
                }
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-xs font-medium text-muted-foreground">
                    {DAY_LABELS[d.getUTCDay()]}
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {d.getUTCDate()}
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {shifts.length === 0 && (
                    <p className="text-xs text-muted-foreground">Off</p>
                  )}
                  {shifts.map((s) => (
                    <div
                      key={s.assignmentId}
                      className="rounded-md border bg-background p-2"
                    >
                      <div className="text-xs font-semibold">{s.name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {formatTime(s.startTime)} — {formatTime(s.endTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.branch.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
