import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-lg",
                t.variant === "success" && "border-emerald-500/40",
                t.variant === "error" && "border-destructive/40",
                t.variant === "info" && "border-border"
              )}
            >
              {t.variant === "success" && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              )}
              {t.variant === "error" && (
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              )}
              {t.variant === "info" && <Info className="mt-0.5 h-4 w-4 text-primary" />}
              <span className="flex-1 text-foreground">{t.message}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
