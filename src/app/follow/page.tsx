"use client";

import { useEffect, useState } from "react";
import { LiveSalesFeed } from "@/components/common/LiveSalesFeed";
import { getSavedAddresses, type SavedAddress } from "@/lib/savedAddresses";
import type { SaleEvent } from "@/lib/objkt";

export default function FollowPage() {
  const [saved, setSaved] = useState<SavedAddress[] | null>(null);
  const [initial, setInitial] = useState<SaleEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const list = getSavedAddresses();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(list);
    if (list.length === 0) return;
    const addresses = list.map((s) => s.address).join(",");
    setLoading(true);
    fetch(`/api/live/sales-involving?addresses=${addresses}&minutes=720`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { sales: SaleEvent[] }) => setInitial(d.sales))
      .catch(() => setInitial([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Follow Feed</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Live sales involving wallets you&apos;ve saved (as buyer, seller, or creator).{" "}
          <a className="underline" href="/config/monitoring">
            Manage saved wallets →
          </a>
        </p>
      </header>

      {saved === null ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-3">
            No wallets saved yet. Add some on the{" "}
            <a className="underline" href="/config/monitoring">monitoring config page</a>.
          </p>
        </div>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading initial feed…</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            Watching {saved.length} wallet{saved.length === 1 ? "" : "s"}
          </p>
          <LiveSalesFeed
            initial={initial}
            endpoint={`/api/live/sales-involving?addresses=${saved.map((s) => s.address).join(",")}&minutes=720&limit=100`}
            pollMs={5000}
          />
        </>
      )}
    </div>
  );
}
