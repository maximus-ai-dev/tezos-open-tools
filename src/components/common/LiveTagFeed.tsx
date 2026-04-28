"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatestMintToken } from "@/lib/objkt";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { BuyButton } from "@/components/common/BuyButton";
import { MARKETPLACE_NAMES } from "@/lib/constants";

interface LiveTagFeedProps {
  initial: LatestMintToken[];
  /** One or more tag names — tokens matching ANY are surfaced (OR). */
  tags: string[];
  since?: string;
  until?: string;
  /** When false, the feed renders without polling. Useful for past-year presets
   *  (e.g. 2024) where no new tokens will arrive. */
  livePollEnabled?: boolean;
  pollMs?: number;
  maxKeep?: number;
}

function tokenKey(t: LatestMintToken): string {
  return `${t.fa_contract}:${t.token_id}`;
}

export function LiveTagFeed({
  initial,
  tags,
  since,
  until,
  livePollEnabled = true,
  pollMs = 12_000,
  maxKeep = 200,
}: LiveTagFeedProps) {
  const [tokens, setTokens] = useState<LatestMintToken[]>(initial);
  const [errored, setErrored] = useState(false);
  const [paused, setPaused] = useState(!livePollEnabled);
  const [newKeys, setNewKeys] = useState<Set<string>>(() => new Set());
  const newCount = newKeys.size;

  const status: "live" | "paused" | "error" = paused ? "paused" : errored ? "error" : "live";

  const tagParam = tags.join(",");
  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ tag: tagParam });
      if (since) params.set("since", since);
      if (until) params.set("until", until);
      const res = await fetch(`/api/tag-feed?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { tokens: LatestMintToken[] };
      setTokens((prev) => {
        const seen = new Set(prev.map(tokenKey));
        const fresh = json.tokens.filter((t) => !seen.has(tokenKey(t)));
        if (fresh.length === 0) return prev;
        setNewKeys((prevKeys) => {
          const next = new Set(prevKeys);
          for (const t of fresh) next.add(tokenKey(t));
          return next;
        });
        return [...fresh, ...prev].slice(0, maxKeep);
      });
      setErrored(false);
    } catch {
      setErrored(true);
    }
  }, [tagParam, since, until, maxKeep]);

  useEffect(() => {
    if (paused || !livePollEnabled) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [paused, pollMs, refresh, livePollEnabled]);

  function clearNewBadges() {
    setNewKeys(new Set());
  }

  return (
    <div>
      {livePollEnabled && (
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
                onClick={clearNewBadges}
                className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {newCount} new — clear
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
      )}

      {tokens.length === 0 ? (
        <p className="text-sm text-zinc-500">No tokens with this tag in the selected window.</p>
      ) : (
        <TokenGrid>
          {tokens.map((t) => {
            const listing = t.listings_active[0];
            const creator = t.creators?.[0]?.holder;
            const isNew = newKeys.has(tokenKey(t));
            return (
              <TokenCard
                key={tokenKey(t)}
                token={{
                  fa: t.fa_contract,
                  tokenId: t.token_id,
                  name: t.name,
                  thumbnailUri: t.thumbnail_uri,
                  displayUri: t.display_uri,
                  artistAddress: creator?.address ?? null,
                  artistAlias: creator?.alias ?? null,
                  supply: t.supply,
                }}
                priceMutez={listing?.price ?? null}
                marketplaceLabel={
                  listing ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? null : null
                }
                badge={isNew ? "NEW" : null}
                footer={
                  listing?.bigmap_key !== null && listing?.bigmap_key !== undefined ? (
                    <BuyButton
                      marketplaceContract={listing.marketplace_contract}
                      askId={listing.bigmap_key}
                      priceMutez={listing.price}
                      amountAvailable={listing.amount_left}
                      tokenName={t.name}
                    />
                  ) : null
                }
              />
            );
          })}
        </TokenGrid>
      )}
    </div>
  );
}
