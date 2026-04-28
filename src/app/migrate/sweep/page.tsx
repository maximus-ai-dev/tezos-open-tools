"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  BatchBuildError,
  buildFa12BatchTransfer,
  diagnoseFa2Transfers,
  sendBatch,
} from "@/lib/tezos/operations";
import { isTezosAddress, ipfsToHttp, shortAddress } from "@/lib/utils";
import type { SweepAsset, SweepAssetsResult } from "@/app/api/sweep-assets/route";
import type { WalletParamsWithKind } from "@taquito/taquito";

const DEFAULT_CHUNK_SIZE = 20;

type Status =
  | "idle"
  | "loading"
  | "ready"
  | "building"
  | "signing"
  | "checking"
  | "done"
  | "error";

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
  const [failedContracts, setFailedContracts] = useState<string[]>([]);
  const [failedTokens, setFailedTokens] = useState<Array<{ fa: string; tokenId: string }>>([]);
  const [chunkSize, setChunkSize] = useState<number>(DEFAULT_CHUNK_SIZE);
  const [diagProgress, setDiagProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });

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
    setError(null);
    setFailedContracts([]);
    setFailedTokens([]);
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

      // FA2: pre-simulate every per-contract op (throttled, with retries) to
      // catch contracts that would fail at signing time. FA1.2 contracts are
      // standardized enough to skip this — and would just slow us down.
      setStatus("checking");
      setDiagProgress({ done: 0, total: 0 });
      const [fa2Result, fa12Ops] = await Promise.all([
        fa2Transfers.length > 0
          ? diagnoseFa2Transfers(address, fa2Transfers, (done, total) =>
              setDiagProgress({ done, total }),
            )
          : Promise.resolve({ ops: [], failedContracts: [], failedTokens: [] }),
        fa12Transfers.length > 0
          ? buildFa12BatchTransfer(address, fa12Transfers)
          : Promise.resolve([]),
      ]);

      if (fa2Result.failedContracts.length > 0 || fa2Result.failedTokens.length > 0) {
        // Surface the failures and let the user uncheck + retry.
        throw new BatchBuildError(fa2Result.failedContracts, fa2Result.failedTokens);
      }

      const allOps: WalletParamsWithKind[] = [...fa2Result.ops, ...fa12Ops];

      // Chunk into multiple signed batches. Smaller chunks → more signing
      // prompts but each batch's RPC estimation is more likely to succeed.
      const safeChunkSize = Math.max(1, Math.min(50, chunkSize));
      const chunks: WalletParamsWithKind[][] = [];
      for (let i = 0; i < allOps.length; i += safeChunkSize) {
        chunks.push(allOps.slice(i, i + safeChunkSize));
      }
      setStatus("signing");
      setProgress({ batch: 0, total: chunks.length, opHashes: [] });

      const opHashes: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const { opHash } = await sendBatch(chunks[i]!);
        opHashes.push(opHash);
        setProgress({ batch: i + 1, total: chunks.length, opHashes: [...opHashes] });
      }

      setStatus("done");
    } catch (err) {
      // Always log the raw error so DevTools shows the full stack — the
      // rendered message is intentionally short.
      console.error("Sweep failed:", err);
      if (err instanceof BatchBuildError) {
        setFailedContracts(err.failedContracts);
        setFailedTokens(err.failedTokens);
        const parts: string[] = [];
        if (err.failedContracts.length > 0) {
          parts.push(
            `${err.failedContracts.length} contract${err.failedContracts.length === 1 ? "" : "s"} failed to load`,
          );
        }
        if (err.failedTokens.length > 0) {
          parts.push(
            `${err.failedTokens.length} token${err.failedTokens.length === 1 ? "" : "s"} had malformed IDs`,
          );
        }
        setError(`${parts.join(" and ")}. Click "Uncheck broken" below and retry.`);
      } else {
        setFailedContracts([]);
        setFailedTokens([]);
        setError(err instanceof Error ? err.message : String(err));
      }
      setStatus("error");
    }
  }

  function uncheckFailed() {
    if ((failedContracts.length === 0 && failedTokens.length === 0) || !data) return;
    const failedFaSet = new Set(failedContracts);
    const failedTokenKeys = new Set(failedTokens.map((t) => `${t.fa}:${t.tokenId}`));
    setSelected((s) => {
      const next = new Set(s);
      for (const a of [...data.fa12, ...data.fa2_fungibles, ...data.fa2_nfts]) {
        if (failedFaSet.has(a.fa) || failedTokenKeys.has(`${a.fa}:${a.token_id}`)) {
          next.delete(assetKey(a));
        }
      }
      return next;
    });
    setFailedContracts([]);
    setFailedTokens([]);
    setError(null);
    setStatus("ready");
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Batch size
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                value={chunkSize}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setChunkSize(Number.isFinite(n) ? Math.max(1, Math.min(50, n)) : DEFAULT_CHUNK_SIZE);
                }}
                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
              />
              <span className="text-xs text-zinc-500">
                ops per signed batch (1–50). Each click of &ldquo;Sweep&rdquo; first runs a
                throttled simulation pass to filter out broken contracts before any wallet prompt.
              </span>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Selected ({selectedAssets.length})
            </h2>
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
              includeMinted={includeMinted}
              showMintedFlag
            />
          )}

          <div className="sticky bottom-0 mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800">
            {status === "error" && error && (
              <div className="mb-3 rounded-md p-3 text-sm bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900">
                <p className="break-words">{error}</p>
                {(failedContracts.length > 0 || failedTokens.length > 0) && (
                  <>
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer">
                        Show {failedContracts.length + failedTokens.length} broken item
                        {failedContracts.length + failedTokens.length === 1 ? "" : "s"}
                      </summary>
                      <ul className="mt-1 space-y-0.5 font-mono break-all">
                        {failedContracts.map((c) => (
                          <li key={`fa:${c}`}>{c} (whole contract)</li>
                        ))}
                        {failedTokens.map((t) => (
                          <li key={`tok:${t.fa}:${t.tokenId}`}>
                            {t.fa} #{t.tokenId}
                          </li>
                        ))}
                      </ul>
                    </details>
                    <button
                      type="button"
                      onClick={uncheckFailed}
                      className="mt-2 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                    >
                      Uncheck broken and retry
                    </button>
                  </>
                )}
                {failedContracts.length === 0 && failedTokens.length === 0 && (
                  <p className="mt-2 text-xs">
                    Open DevTools → Console for the full stack trace.
                  </p>
                )}
              </div>
            )}
            {status === "checking" && (
              <div className="mb-3 rounded-md p-3 text-sm bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <p>
                  Checking {diagProgress.done} / {diagProgress.total || "…"} contracts (3
                  concurrent, retries on rate-limit). No wallet prompts — read-only RPC simulation.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!ready || status === "signing" || status === "building" || status === "checking"}
              className="w-full px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {status === "checking"
                ? `Checking transfers ${diagProgress.done} / ${diagProgress.total || "…"}…`
                : status === "building"
                ? "Preparing operations…"
                : status === "signing"
                  ? progress.total === 0
                    ? "Awaiting wallet…"
                    : `Signing batch ${progress.batch + 1} / ${progress.total}…`
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
        busy={status === "signing" || status === "building"}
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
          Will be split into batches of up to {chunkSize} ops. Beacon will prompt once per batch.
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
  includeMinted = false,
  showMintedFlag = false,
}: {
  title: string;
  assets: SweepAsset[];
  selected: Set<string>;
  toggle: (a: SweepAsset) => void;
  bulkToggle: (assets: SweepAsset[], checked: boolean) => void;
  includeMinted?: boolean;
  showMintedFlag?: boolean;
}) {
  // Eligibility = self-minted NFTs are out unless the user opted in.
  const eligible = assets.filter((a) => !(a.self_minted && !includeMinted));
  const ineligibleCount = assets.length - eligible.length;
  const selectedCount = eligible.reduce(
    (n, a) => (selected.has(assetKey(a)) ? n + 1 : n),
    0,
  );
  const allChecked = selectedCount === eligible.length && eligible.length > 0;
  const someChecked = selectedCount > 0 && selectedCount < eligible.length;
  const sectionDisabled = eligible.length === 0;
  return (
    <section className="mt-6">
      <label
        className={`flex items-center gap-2 mb-2 ${
          sectionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={allChecked}
          disabled={sectionDisabled}
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          onChange={(e) => bulkToggle(eligible, e.target.checked)}
        />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
        <span className="text-xs text-zinc-500">
          — {selectedCount}/{eligible.length} selected
          {ineligibleCount > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              {" "}
              · {ineligibleCount} self-minted excluded
            </span>
          )}
        </span>
      </label>
      {sectionDisabled && ineligibleCount > 0 && (
        <p className="-mt-1 mb-2 text-xs text-amber-700 dark:text-amber-400">
          All items here are self-minted — enable &ldquo;Include NFTs you minted&rdquo; above to
          select them.
        </p>
      )}
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
