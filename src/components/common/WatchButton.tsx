"use client";

import { useEffect, useState } from "react";
import {
  addSavedAddress,
  getSavedAddresses,
  removeSavedAddress,
} from "@/lib/savedAddresses";

interface WatchButtonProps {
  address: string;
  /** Optional alias to save as the label (e.g. an artist name). */
  label?: string | null;
  /** "compact" for inline use on cards/rows; "full" for headers. */
  variant?: "compact" | "full";
}

export function WatchButton({ address, label, variant = "compact" }: WatchButtonProps) {
  const [watching, setWatching] = useState<boolean | null>(null);

  useEffect(() => {
    const list = getSavedAddresses();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatching(list.some((s) => s.address === address));
  }, [address]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (watching) {
      removeSavedAddress(address);
      setWatching(false);
    } else {
      addSavedAddress(address, label ?? undefined);
      setWatching(true);
    }
  }

  if (watching === null) return null; // SSR / pre-hydration

  const compactBase =
    "text-[11px] px-2 py-0.5 rounded font-medium transition-colors";
  const fullBase = "text-xs px-3 py-1.5 rounded-md font-medium transition-colors";
  const active =
    "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900";
  const inactive =
    "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:opacity-90";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${variant === "compact" ? compactBase : fullBase} ${watching ? active : inactive}`}
      title={
        watching
          ? `Stop watching this wallet (managed in /config/monitoring)`
          : `Save this wallet — its activity will show in /follow`
      }
    >
      {watching ? "★ Watching" : "+ Watch"}
    </button>
  );
}
