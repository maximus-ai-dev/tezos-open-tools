"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { isPinned, pinToken, unpinToken } from "@/lib/savedTokens";

interface PinButtonProps {
  fa: string;
  tokenId: string;
  variant?: "compact" | "full";
}

export function PinButton({ fa, tokenId, variant = "compact" }: PinButtonProps) {
  const { address } = useWallet();
  const [pinned, setPinned] = useState<boolean | null>(null);

  useEffect(() => {
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinned(null);
      return;
    }
    setPinned(isPinned(address, fa, tokenId));
  }, [address, fa, tokenId]);

  if (!address) return null;
  if (pinned === null) return null;

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!address) return;
    if (pinned) {
      unpinToken(address, fa, tokenId);
      setPinned(false);
    } else {
      pinToken(address, fa, tokenId);
      setPinned(true);
    }
  }

  const compact = "text-[11px] px-2 py-0.5 rounded font-medium transition-colors";
  const full = "text-xs px-3 py-1.5 rounded-md font-medium transition-colors";
  const active =
    "bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800";
  const inactive =
    "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${variant === "compact" ? compact : full} ${pinned ? active : inactive}`}
      title={
        pinned
          ? "Unpin (your pinned set is local to this browser + wallet)"
          : "Pin to your local pinned set"
      }
    >
      {pinned ? "📌 Pinned" : "Pin"}
    </button>
  );
}
