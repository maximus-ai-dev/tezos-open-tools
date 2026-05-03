"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import {
  clearPinnedTokens,
  encodePinsParam,
  getPinnedTokens,
  pinToken,
  type PinnedToken,
  unpinToken,
} from "@/lib/savedTokens";
import { objktTokenLink, MARKETPLACE_NAMES } from "@/lib/constants";
import { parseTokenInput } from "@/lib/utils";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { TokenBuyFooter } from "@/components/common/TokenBuyFooter";
import type { LatestMintToken } from "@/lib/objkt";

export default function PinPage() {
  const { address, status, connect } = useWallet();
  const [pins, setPins] = useState<PinnedToken[] | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<LatestMintToken[]>([]);

  useEffect(() => {
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPins(null);
      return;
    }
    setPins(getPinnedTokens(address));
  }, [address]);

  // Hydrate the pinned (fa, tokenId) pairs into full token data — thumbnails,
  // current listings, OE info — so we can render TokenCards with inline buy.
  useEffect(() => {
    if (!pins || pins.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTokens([]);
      return;
    }
    const param = pins.map((p) => `${p.fa}:${p.tokenId}`).join(",");
    let cancelled = false;
    fetch(`/api/tokens-by-pairs?pairs=${encodeURIComponent(param)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { tokens: LatestMintToken[] }) => {
        if (!cancelled) setTokens(d.tokens);
      })
      .catch(() => {
        if (!cancelled) setTokens([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pins]);

  function add() {
    setParseError(null);
    if (!address) return;
    const parsed = parseTokenInput(tokenInput);
    if (!parsed) {
      setParseError("Couldn't parse — paste an objkt token URL or KT1...:tokenId");
      return;
    }
    setPins(pinToken(address, parsed.fa, parsed.tokenId));
    setTokenInput("");
  }

  function remove(t: PinnedToken) {
    if (!address) return;
    setPins(unpinToken(address, t.fa, t.tokenId));
  }

  function clearAll() {
    if (!address) return;
    if (!confirm(`Remove all ${pins?.length ?? 0} pinned tokens?`)) return;
    clearPinnedTokens(address);
    setPins([]);
  }

  function copyShareLink() {
    if (!address || !pins || pins.length === 0) return;
    const param = encodePinsParam(pins);
    const url = `${window.location.origin}/flex?address=${address}&pins=${param}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pin Your Art</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Mark tokens as &ldquo;featured&rdquo; in your pinned set. Pins are stored locally for the
          connected wallet — they&apos;re visible on{" "}
          <a className="text-blue-600 dark:text-blue-400 hover:underline" href="/flex">
            /flex
          </a>{" "}
          when you visit your own collection. Share a curated view via a URL that bakes the pin
          list into the link.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          v1: localStorage-only (no on-chain sync). Future versions may add on-chain pinning so
          others can see your pinned set without you sharing a URL.
        </p>
      </header>

      {!address ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Connect your wallet — pinning is per-wallet.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={status === "connecting"}
            className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {status === "connecting" ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      ) : pins === null ? (
        <p className="text-sm text-zinc-500">Loading pins…</p>
      ) : (
        <>
          <section className="mb-6 rounded-md border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-sm font-semibold mb-2">Add a token to your pins</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="objkt token URL or KT1...:tokenId"
                className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={add}
                className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Pin
              </button>
            </div>
            {parseError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{parseError}</p>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              Tip: every TokenCard across the toolkit also has a pin button you can use directly.
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Your pinned tokens ({pins.length})
              </h2>
              <div className="flex gap-2">
                {pins.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copied ? "✓ Copied" : "Copy share link"}
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-xs px-3 py-1 rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            </div>
            {pins.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No pinned tokens yet. Add one above, or click the Pin button on any token card
                across the toolkit.
              </p>
            ) : (
              <>
                <TokenGrid>
                  {pins.map((p) => {
                    const t = tokens.find(
                      (x) => x.fa_contract === p.fa && x.token_id === p.tokenId,
                    );
                    if (!t) {
                      // Pre-hydrate placeholder — token data still loading or
                      // the token has been removed from objkt.
                      return (
                        <article
                          key={`${p.fa}:${p.tokenId}`}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-xs"
                        >
                          <a
                            href={objktTokenLink(p.fa, p.tokenId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {p.fa.slice(0, 10)}…:{p.tokenId}
                          </a>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-zinc-400">
                              pinned {new Date(p.pinnedAt).toLocaleDateString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => remove(p)}
                              className="px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            >
                              Unpin
                            </button>
                          </div>
                        </article>
                      );
                    }
                    const listing = t.listings_active[0];
                    return (
                      <TokenCard
                        key={`${t.fa_contract}:${t.token_id}`}
                        token={{
                          fa: t.fa_contract,
                          tokenId: t.token_id,
                          name: t.name,
                          thumbnailUri: t.thumbnail_uri,
                          displayUri: t.display_uri,
                          artistAddress: t.creators?.[0]?.holder.address ?? null,
                          artistAlias: t.creators?.[0]?.holder.alias ?? null,
                          supply: t.supply,
                        }}
                        priceMutez={listing?.price ?? t.open_edition_active?.price ?? null}
                        marketplaceLabel={
                          listing
                            ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? "marketplace"
                            : t.open_edition_active
                              ? "open edition"
                              : null
                        }
                        footer={
                          <div className="flex items-center gap-2 flex-wrap">
                            <TokenBuyFooter token={t} />
                            <button
                              type="button"
                              onClick={() => remove(p)}
                              className="text-[11px] px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            >
                              Unpin
                            </button>
                          </div>
                        }
                      />
                    );
                  })}
                </TokenGrid>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
