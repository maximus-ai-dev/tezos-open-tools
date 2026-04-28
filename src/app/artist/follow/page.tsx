"use client";

import { useEffect, useState } from "react";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { getSavedAddresses, type SavedAddress } from "@/lib/savedAddresses";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import type { LatestMintToken } from "@/lib/objkt";

interface ApiResponse {
  tokens: LatestMintToken[];
}

export default function FollowingAnalysisPage() {
  const [saved, setSaved] = useState<SavedAddress[] | null>(null);
  const [tokens, setTokens] = useState<LatestMintToken[] | null>(null);

  useEffect(() => {
    const list = getSavedAddresses();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(list);
    if (list.length === 0) return;
    const addresses = list.map((s) => s.address).join(",");
    fetch(`/api/creations-by?addresses=${addresses}&limit=60`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: ApiResponse) => setTokens(d.tokens))
      .catch(() => setTokens([]));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Watched Artists Feed</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Latest creations from artists you&apos;ve saved.{" "}
          <a className="underline" href="/config/monitoring">
            Manage list →
          </a>
        </p>
      </header>

      {saved === null ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Save artist wallets on the{" "}
            <a className="underline" href="/config/monitoring">monitoring config page</a>{" "}
            to see their latest mints here.
          </p>
        </div>
      ) : tokens === null ? (
        <p className="text-sm text-zinc-500">Loading creations…</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-zinc-500">No recent creations from saved wallets.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            Following {saved.length} wallet{saved.length === 1 ? "" : "s"} — showing {tokens.length} latest creations
          </p>
          <TokenGrid>
            {tokens.map((t) => {
              const listing = t.listings_active[0];
              const creator = t.creators?.[0]?.holder;
              return (
                <TokenCard
                  key={`${t.fa_contract}:${t.token_id}`}
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
                    listing ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? "marketplace" : null
                  }
                />
              );
            })}
          </TokenGrid>
        </>
      )}
    </div>
  );
}
