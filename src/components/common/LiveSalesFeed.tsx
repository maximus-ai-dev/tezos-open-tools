"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaleEvent } from "@/lib/objkt";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { MARKETPLACE_NAMES } from "@/lib/constants";

interface LiveSalesFeedProps {
  initial: SaleEvent[];
  endpoint: string;
  pollMs?: number;
  maxKeep?: number;
}

export function LiveSalesFeed({
  initial,
  endpoint,
  pollMs = 4000,
  maxKeep = 120,
}: LiveSalesFeedProps) {
  const [sales, setSales] = useState<SaleEvent[]>(initial);
  const [errored, setErrored] = useState(false);
  const [paused, setPaused] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const lastIdRef = useRef<string | null>(initial[0]?.id ?? null);

  const status: "live" | "paused" | "error" = paused ? "paused" : errored ? "error" : "live";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { sales: SaleEvent[] };
      setSales((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        const fresh = json.sales.filter((s) => !seen.has(s.id));
        if (fresh.length === 0) return prev;
        const merged = [...fresh, ...prev].slice(0, maxKeep);
        if (paused) setNewCount((c) => c + fresh.length);
        if (fresh[0]) lastIdRef.current = fresh[0].id;
        return merged;
      });
      setErrored(false);
    } catch {
      setErrored(true);
    }
  }, [endpoint, maxKeep, paused]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [paused, pollMs, refresh]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status === "live"
                ? "bg-green-500 animate-pulse"
                : status === "paused"
                  ? "bg-zinc-400"
                  : "bg-red-500"
            }`}
          />
          <span className="text-zinc-600 dark:text-zinc-400">
            {status === "live"
              ? `Live · polling every ${pollMs / 1000}s`
              : status === "paused"
                ? "Paused"
                : "Connection error — retrying"}
          </span>
          {newCount > 0 && (
            <button
              type="button"
              onClick={() => setNewCount(0)}
              className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              {newCount} new
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-zinc-500">Waiting for sales…</p>
      ) : (
        <TokenGrid>
          {sales.map((s) => {
            if (!s.token) return null;
            const creator = s.token.creators?.[0]?.holder;
            return (
              <TokenCard
                key={s.id}
                token={{
                  fa: s.token.fa_contract,
                  tokenId: s.token.token_id,
                  name: s.token.name,
                  thumbnailUri: s.token.thumbnail_uri,
                  displayUri: s.token.display_uri,
                  artistAddress: creator?.address ?? null,
                  artistAlias: creator?.alias ?? null,
                }}
                priceMutez={s.price_xtz ?? s.price}
                marketplaceLabel={MARKETPLACE_NAMES[s.marketplace_contract] ?? "marketplace"}
                badge={<RelativeTime ts={s.timestamp} />}
              />
            );
          })}
        </TokenGrid>
      )}
    </div>
  );
}

function RelativeTime({ ts }: { ts: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ageSec = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 1000));
  let label: string;
  if (ageSec < 60) label = `${ageSec}s ago`;
  else if (ageSec < 3600) label = `${Math.floor(ageSec / 60)}m ago`;
  else if (ageSec < 86400) label = `${Math.floor(ageSec / 3600)}h ago`;
  else label = `${Math.floor(ageSec / 86400)}d ago`;
  return <>{label}</>;
}
