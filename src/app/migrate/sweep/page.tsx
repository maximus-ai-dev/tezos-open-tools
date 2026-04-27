"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  buildFa2BatchTransfer,
  buildFa12BatchTransfer,
  sendBatch,
} from "@/lib/tezos/operations";
import { isTezosAddress, ipfsToHttp, shortAddress } from "@/lib/utils";
import type { SweepAsset, SweepAssetsResult } from "@/app/api/sweep-assets/route";
import type { WalletParamsWithKind } from "@taquito/taquito";

const CHUNK_SIZE = 50;

type Status = "idle" | "loading" | "ready" | "signing" | "done" | "error";

export default function SweepPage() {
  const { address, status: walletStatus, connect } = useWallet();
  const [data, setData] = useState<SweepAssetsResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [destination, setDestination] = useState("");
  const [confirmDest, setConfirmDest] = useState("");
  const [includeMinted, setIncludeMinted] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{ batch: number; total: number; opHashes: string[] }>({
    batch: 0,
    total: 0,
    opHashes: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    fetch(`/api/sweep-assets?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: SweepAssetsResult) => {
        if (cancelled) return;
        setData(d);
        // Default selection: everything except self-minted NFTs.
        const next = new Set<string>();
        for (const a of d.fa12) next.add(assetKey(a));
        for (const a of d.fa2_fungibles) next.add(assetKey(a));
        for (const a of d.fa2_nfts) if (!a.self_minted) next.add(assetKey(a));
        setSelected(next);
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  // When the user toggles "include self-minted", batch-add or remove them from the set.
  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected((s) => {
      const next = new Set(s);
      for (const a of data.fa2_nfts) {
        if (!a.self_minted) continue;
        if (includeMinted) next.add(assetKey(a));
        else next.delete(assetKey(a));
      }
      return next;
    });
  }, [includeMinted, data]);

  function toggle(a: SweepAsset) {
    setSelected((s) => {
      const next = new Set(s);
      const k = assetKey(a);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  /** Bulk add or remove all keys for a group, respecting the includeMinted toggle. */
  function bulkToggle(assets: SweepAsset[], checked: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      for (const a of assets) {
        // Don't auto-select self-minted NFTs unless the user has opted in.
        if (checked && a.self_minted && !includeMinted) continue;
        const k = assetKey(a);
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  function selectAll() {
    if (!data) return;
    bulkToggle([...data.fa12, ...data.fa2_fungibles, ...data.fa2_nfts], true);
  }
  function deselectAll() {
    setSelected(new Set());
  }

  const allAssets = useMemo<SweepAsset[]>(() => {
    if (!data) return [];
    return [...data.fa12, ...data.fa2_fungibles, ...data.fa2_nfts];
  }, [data]);

  const selectedAssets = useMemo(
    () => allAssets.filter((a) => selected.has(assetKey(a))),
    [allAssets, selected],
  );

  const counts = useMemo(() => {
    let nft = 0;
    let fungible = 0;
    let selfMinted = 0;
    for (const a of selectedAssets) {
      if (a.kind === "nft") {
        nft++;
        if (a.self_minted) selfMinted++;
      } else fungible++;
    }
    return { nft, fungible, selfMinted };
  }, [selectedAssets]);

  const validDest = isTezosAddress(destination);
  const destMatches = destination === confirmDest;
  const ready =
    address && validDest && destMatches && destination !== address && selectedAssets.length > 0;

  async function sweep() {
    setConfirmOpen(false);
    if (!ready || !address) return;
    setStatus("signing");
    setError(null);
    setProgress({ batch: 0, total: 0, opHashes: [] });
    try {
      // Build all per-asset operations.
      const fa2Transfers = selectedAssets
        .filter((a) => a.standard === "fa2")
        .map((a) => ({
          fa: a.fa,
          tokenId: a.token_id,
          to: destination,
          amount: balanceAsNumber(a.balance),
        }));
      const fa12Transfers = selectedAssets
        .filter((a) => a.standard === "fa1.2")
        .map((a) => ({ fa: a.fa, to: destination, amount: a.balance }));

      const allOps: WalletParamsWithKind[] = [];
      if (fa2Transfers.length > 0) {
        const fa2Ops = await buildFa2BatchTransfer(address, fa2Transfers);
        allOps.push(...fa2Ops);
      }
      if (fa12Transfers.length > 0) {
        const fa12Ops = await buildFa12BatchTransfer(address, fa12Transfers);
        allOps.push(...fa12Ops);
      }

      // Chunk into multiple signed batches if too big.
      const chunks: WalletParamsWithKind[][] = [];
      for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
        chunks.push(allOps.slice(i, i + CHUNK_SIZE));
      }
      setProgress({ batch: 0, total: chunks.length, opHashes: [] });

      const opHashes: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const { opHash } = await sendBatch(chunks[i]!);
        opHashes.push(opHash);
        setProgress({ batch: i + 1, total: chunks.length, opHashes: [...opHashes] });
      }

      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  if (!address) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Wallet sweep</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Move all your NFTs and fungible tokens (USDC, kUSD, DOGA, …) from this wallet to another
          one in a few signed batches. Tez balance is not touched — keep some for gas.
        </p>
        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Connect your wallet to discover what you hold.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={walletStatus === "connecting"}
            className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {walletStatus === "connecting" ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet sweep</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Move all your NFTs and fungible tokens to another wallet in chunked, signed batches. Your{" "}
        <strong>tez balance is never touched</strong> — keep some for gas.
      </p>

      {status === "loading" && (
        <p className="mt-6 text-sm text-zinc-500">Discovering your assets…</p>
      )}
      {status === "error" && error && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400 break-words">{error}</p>
      )}

      {data && (
        <>
          {(data.warnings.active_listings > 0 || data.warnings.active_operators > 0) && (
            <div className="mt-6 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-4 text-sm">
              <strong className="text-amber-900 dark:text-amber-100">Heads up:</strong>
              <ul className="mt-1 list-disc list-inside text-amber-900 dark:text-amber-100 space-y-1">
                {data.warnings.active_listings > 0 && (
                  <li>
                    You have <strong>{data.warnings.active_listings}</strong> active listings on
                    objkt. Sweeping the underlying tokens will leave those listings unfulfillable
                    (not auto-cancelled). Cancel them at{" "}
                    <Link href="/artist/sale" className="underline">
                      /artist/sale
                    </Link>{" "}
                    first if you care.
                  </li>
                )}
                {data.warnings.active_operators > 0 && (
                  <li>
                    You have <strong>{data.warnings.active_operators}</strong> operator approvals on
                    tokens you&apos;re sweeping. They stay attached to this old wallet and don&apos;t
                    follow the tokens. Revoke at{" "}
                    <Link href="/operators" className="underline">
                      /operators
                    </Link>{" "}
                    if you&apos;re leaving this wallet.
                  </li>
                )}
              </ul>
            </div>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Destination
            </h2>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="tz1... destination wallet"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
            />
            <input
              type="text"
              value={confirmDest}
              onChange={(e) => setConfirmDest(e.target.value)}
              placeholder="re-type to confirm"
              className="mt-2 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
            />
            {destination && !validDest && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Not a valid Tezos address.
              </p>
            )}
            {destination && destination === address && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Destination can&apos;t be the source wallet.
              </p>
            )}
            {destination && confirmDest && !destMatches && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Confirm address doesn&apos;t match.
              </p>
            )}
          </section>

          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Selected ({selectedAssets.length})
              </h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  Deselect all
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              {counts.nft} NFT{counts.nft === 1 ? "" : "s"}, {counts.fungible} fungible token
              {counts.fungible === 1 ? "" : "s"}
              {counts.selfMinted > 0 && (
                <span className="text-amber-700 dark:text-amber-400">
                  {" "}
                  ({counts.selfMinted} self-minted)
                </span>
              )}
            </p>
          </section>

          {data.fa2_nfts.some((a) => a.self_minted) && (
            <label className="mt-4 flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={includeMinted}
                onChange={(e) => setIncludeMinted(e.target.checked)}
              />
              Include NFTs you minted (your own art) —{" "}
              {data.fa2_nfts.filter((a) => a.self_minted).length} excluded by default
            </label>
          )}

          {data.fa12.length > 0 && (
            <AssetGroup
              title={`FA1.2 fungibles (${data.fa12.length})`}
              assets={data.fa12}
              selected={selected}
              toggle={toggle}
              bulkToggle={bulkToggle}
            />
          )}
          {data.fa2_fungibles.length > 0 && (
            <AssetGroup
              title={`FA2 fungibles (${data.fa2_fungibles.length})`}
              assets={data.fa2_fungibles}
              selected={selected}
              toggle={toggle}
              bulkToggle={bulkToggle}
            />
          )}
          {data.fa2_nfts.length > 0 && (
            <AssetGroup
              title={`NFTs (${data.fa2_nfts.length})`}
              assets={data.fa2_nfts}
              selected={selected}
              toggle={toggle}
              bulkToggle={bulkToggle}
              showMintedFlag
            />
          )}

          <div className="sticky bottom-0 mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!ready || status === "signing"}
              className="w-full px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {status === "signing"
                ? `Signing batch ${progress.batch} / ${progress.total}…`
                : !validDest || !destMatches
                  ? "Enter a destination address"
                  : selectedAssets.length === 0
                    ? "Select something to sweep"
                    : `Sweep ${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"} → ${shortAddress(destination)}`}
            </button>
          </div>

          {progress.opHashes.length > 0 && (
            <div className="mt-4 rounded-md p-3 text-sm bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900">
              <div className="font-medium mb-1">
                {status === "done"
                  ? `Done — ${progress.opHashes.length} batch${progress.opHashes.length === 1 ? "" : "es"} sent.`
                  : `Sent ${progress.opHashes.length} of ${progress.total} batches…`}
              </div>
              <ul className="space-y-1 text-xs font-mono break-all">
                {progress.opHashes.map((h, i) => (
                  <li key={h}>
                    Batch {i + 1}:{" "}
                    <a
                      href={`https://tzkt.io/${h}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {h}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Sweep ${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"}?`}
        confirmLabel={`Sign — sweep to ${shortAddress(destination)}`}
        busy={status === "signing"}
        onConfirm={() => void sweep()}
        onCancel={() => setConfirmOpen(false)}
        warning={
          <>
            Sweeping{" "}
            <strong>
              {counts.nft} NFT{counts.nft === 1 ? "" : "s"}
              {counts.fungible > 0 && ` + ${counts.fungible} fungible`}
            </strong>{" "}
            {counts.selfMinted > 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                (incl. {counts.selfMinted} you minted){" "}
              </span>
            )}
            to{" "}
            <code className="font-mono text-xs break-all">{destination}</code>. Once signed, this is
            irreversible. Your tez balance is not touched.
          </>
        }
      >
        <p className="text-xs text-zinc-500">
          Will be split into{" "}
          {Math.ceil((selectedAssets.length + 0.5) / CHUNK_SIZE)} signed batch
          {Math.ceil((selectedAssets.length + 0.5) / CHUNK_SIZE) === 1 ? "" : "es"} of up to{" "}
          {CHUNK_SIZE} ops each. Beacon will prompt once per batch.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function AssetGroup({
  title,
  assets,
  selected,
  toggle,
  bulkToggle,
  showMintedFlag = false,
}: {
  title: string;
  assets: SweepAsset[];
  selected: Set<string>;
  toggle: (a: SweepAsset) => void;
  bulkToggle: (assets: SweepAsset[], checked: boolean) => void;
  showMintedFlag?: boolean;
}) {
  const selectedCount = assets.reduce(
    (n, a) => (selected.has(assetKey(a)) ? n + 1 : n),
    0,
  );
  const allChecked = selectedCount === assets.length && assets.length > 0;
  const someChecked = selectedCount > 0 && selectedCount < assets.length;
  return (
    <section className="mt-6">
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          onChange={(e) => bulkToggle(assets, e.target.checked)}
        />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
        {selectedCount > 0 && (
          <span className="text-xs text-zinc-500">
            — {selectedCount}/{assets.length} selected
          </span>
        )}
      </label>
      <ul className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
        {assets.map((a) => (
          <AssetRow
            key={assetKey(a)}
            asset={a}
            checked={selected.has(assetKey(a))}
            onToggle={() => toggle(a)}
            showMintedFlag={showMintedFlag}
          />
        ))}
      </ul>
    </section>
  );
}

function AssetRow({
  asset,
  checked,
  onToggle,
  showMintedFlag,
}: {
  asset: SweepAsset;
  checked: boolean;
  onToggle: () => void;
  showMintedFlag?: boolean;
}) {
  const thumb = ipfsToHttp(asset.thumbnail_uri) ?? ipfsToHttp(asset.display_uri);
  const displayBalance = formatAssetAmount(asset);
  return (
    <li className="px-3 py-2 flex items-center gap-3">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="w-8 h-8 rounded object-cover bg-zinc-100 dark:bg-zinc-900 shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 shrink-0 flex items-center justify-center text-[10px] text-zinc-500">
          {asset.symbol ?? "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">
          {asset.name ?? asset.symbol ?? `#${asset.token_id}`}
          {showMintedFlag && asset.self_minted && (
            <span className="ml-2 text-[10px] uppercase text-amber-700 dark:text-amber-400">
              self-minted
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-500 truncate">
          {asset.fa_alias ?? shortAddress(asset.fa)}
          {asset.kind === "nft" && asset.token_id ? ` · #${asset.token_id}` : ""}
        </div>
      </div>
      <div className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0">
        {displayBalance}
      </div>
    </li>
  );
}

function assetKey(a: SweepAsset): string {
  return `${a.standard}:${a.fa}:${a.token_id}`;
}

function formatAssetAmount(a: SweepAsset): string {
  if (a.kind === "nft") {
    const n = balanceAsNumber(a.balance);
    return n === 1 ? "" : `×${n}`;
  }
  // Fungible: divide by 10^decimals.
  const raw = a.balance;
  if (a.decimals === 0) return raw + (a.symbol ? ` ${a.symbol}` : "");
  const num = Number(raw) / 10 ** a.decimals;
  const formatted = num >= 1 ? num.toFixed(2) : num.toPrecision(3);
  return `${formatted}${a.symbol ? " " + a.symbol : ""}`;
}

function balanceAsNumber(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
