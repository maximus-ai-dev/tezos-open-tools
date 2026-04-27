import type { ReactNode } from "react";

interface StubPageProps {
  title: string;
  intent: string;
  reason: string;
  manualWorkaround?: ReactNode;
}

/**
 * Banner-page for tools that are intentionally not yet implemented.
 * Use this when a tool requires marketplace-specific contract knowledge or
 * external data we haven't wired up yet — better to be loud than silent.
 */
export function StubPage({ title, intent, reason, manualWorkaround }: StubPageProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-5">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
            Stub — not yet implemented
          </span>
        </div>
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">What this tool will do</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">{intent}</p>
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Why it&apos;s a stub</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">{reason}</p>
        {manualWorkaround && (
          <>
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">For now</h2>
            <div className="text-sm text-zinc-700 dark:text-zinc-300">{manualWorkaround}</div>
          </>
        )}
      </div>
    </div>
  );
}
