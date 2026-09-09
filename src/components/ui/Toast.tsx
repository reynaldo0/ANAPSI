"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Toast, ToastTone } from "@/types";
import { announceLiveRegion } from "@/lib/announcement";
import { cn } from "@/lib/cn";

export interface ToastInput {
  tone: ToastTone;
  message: string;
  title?: string;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

const TONES: Record<ToastTone, string> = {
  success: "border-success bg-success-soft",
  warning: "border-warning bg-warning-soft",
  danger: "border-danger bg-danger-soft",
  info: "border-border bg-card",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...input, id }]);
    announceLiveRegion([input.title, input.message].filter(Boolean).join(". "), {
      assertive: input.tone === "danger" || input.tone === "warning",
    });
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
        aria-label="Pemberitahuan"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-md animate-slide-down items-start gap-3 rounded-14 border-2 px-4 py-3 shadow-card",
                TONES[t.tone],
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
              <div className="min-w-0">
                {t.title ? <p className="font-black">{t.title}</p> : null}
                <p className="text-sm font-medium">{t.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
