"use client";

import { useEffect, type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Body content — usually a summary of what's about to happen. */
  children: ReactNode;
  /** Confirm button label, e.g. "Sign 3 operations". */
  confirmLabel: string;
  /** Optional warning shown above the buttons in red text. */
  warning?: ReactNode;
  /** Confirm button color. Default zinc; "danger" = red, "warn" = amber. */
  tone?: "default" | "danger" | "warn";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  warning,
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClasses =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : tone === "warn"
        ? "bg-amber-600 hover:bg-amber-700 text-white"
        : "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:opacity-90";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-lg rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto text-sm">{children}</div>
        {warning && (
          <div className="px-5 py-3 border-t border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 text-xs text-amber-900 dark:text-amber-200">
            {warning}
          </div>
        )}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 ${confirmClasses}`}
          >
            {busy ? "Signing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
