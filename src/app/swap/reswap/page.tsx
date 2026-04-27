"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  buildBatchListings,
  buildCancelBatch,
  isCancellable,
  sendBatch,
} from "@/lib/tezos/operations";
import {
  MARKETPLACE_NAMES,
  objktTokenLink,
} from "@/lib/constants";
import { formatTez, ipfsToHttp } from "@/lib/utils";
import type { SellerListing } from "@/lib/objkt";

type ListingState = "keep" | "cancel" | "reprice";

interface RowState {
  state: ListingState;
  newPriceTez: string;
}

const OBJKT_V6_2 = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";

export default function BatchReswapPage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<{ address: string; listings: SellerListing[] } | null>(null);
  const [rows, setRows] = useState<Map<string, RowState>>(new Map());
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loading = !!address && data?.address !== address;
  const listings = data?.address === address ? data.listings : null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/listings?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { listings: SellerListing[] }) => {
        if (!cancelled) setData({ address, listings: res.listings });
      })
      .catch(() => {
        if (!cancelled) setData({ address, listings: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  function setRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { state: "keep" as const, newPriceTez: "" };
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }

  function rowOf(id: string): RowState {
    return rows.get(id) ?? { state: "keep", newPriceTez: "" };
  }

  const counts = useMemo(() => {
    let cancel = 0;
    let reprice = 0;
    for (const v of rows.values()) {
      if (v.state === "cancel") cancel++;
      else if (v.state === "reprice") reprice++;
    }
    return { cancel, reprice, total: cancel + reprice };
  }, [rows]);

  function tryOpenConfirm() {
    setResult(null);
    if (!listings) return;
    if (counts.total === 0) {
      setResult({ ok: false, message: "Mark at least one listing to cancel or reprice." });
      return;
    }
    for (const l of listings) {
      const r = rowOf(l.id);
      if (r.state === "keep") continue;
      if (!isCancellable(l.marketplace_contract) || !l.bigmap_key) {
        setResult({
          ok: false,
          message: `Listing on ${MARKETPLACE_NAMES[l.marketplace_contract] ?? l.marketplace_contract} can't be modified by this tool.`,
        });
        return;
      }
      if (r.state === "reprice") {
        const np = Number(r.newPriceTez);
        if (!Number.isFinite(np) || np <= 0) {
          setResult({ ok: false, message: "Bad new price on a row." });
          return;
        }
      }
    }
    setConfirmOpen(true);
  }

  const planned = useMemo(() => {
    if (!listings) return { cancels: [], reprices: [] };
    const cancels: SellerListing[] = [];
    const reprices: SellerListing[] = [];
    for (const l of listings) {
      const r = rowOf(l.id);
      if (r.state === "cancel") cancels.push(l);
      if (r.state === "reprice") reprices.push(l);
    }
    return { cancels, reprices };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, rows]);

  async function send() {
    setConfirmOpen(false);
    if (!address || !listings) return;

    const cancellableSelected: SellerListing[] = [];
    const repriceTargets: SellerListing[] = [];
    for (const l of listings) {
      const r = rowOf(l.id);
      if (r.state === "keep") continue;
      cancellableSelected.push(l);
      if (r.state === "reprice") repriceTargets.push(l);
    }

    setBusy(true);
    try {
      const cancelOps = await buildCancelBatch(
        cancellableSelected.map((l) => ({
          marketplaceContract: l.marketplace_contract,
          bigmapKey: l.bigmap_key as number,
        })),
      );
      const newListingOps = await buildBatchListings(
        address,
        repriceTargets.map((l) => ({
          fa: l.token!.fa_contract,
          tokenId: l.token!.token_id,
          priceMutez: Math.round(Number(rowOf(l.id).newPriceTez) * 1_000_000),
          editions: l.amount_left,
        })),
      );
      const ops = [...cancelOps, ...newListingOps];
      const { opHash } = await sendBatch(ops);
      setResult({ ok: true, message: opHash });
      setRows(new Map());
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Batch Reswap / Unswap</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cancel many listings and (optionally) re-list them at a new price in one signing prompt.
          Re-listings always go to objkt v6.2; if a listing was originally on a different
          marketplace, the new one will be on objkt.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt connect={connect} status={status} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading your listings…</p>
      ) : !listings || listings.length === 0 ? (
        <p className="text-sm text-zinc-500">No active listings.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Active listings:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{listings.length}</span>
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Cancel: <span className="text-red-600 dark:text-red-400 font-medium">{counts.cancel}</span>
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Reprice:{" "}
              <span className="text-blue-600 dark:text-blue-400 font-medium">{counts.reprice}</span>
            </span>
            <button
              type="button"
              onClick={() => setRows(new Map())}
              className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={tryOpenConfirm}
              disabled={busy || counts.total === 0}
              className="ml-auto px-4 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? "Signing…"
                : `${counts.cancel} cancel${counts.cancel === 1 ? "" : "s"} + ${counts.reprice} repric${counts.reprice === 1 ? "ing" : "ings"}`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Current</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Editions</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Action</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">New price (ꜩ)</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const tok = l.token;
                  const r = rowOf(l.id);
                  const cancellable = isCancellable(l.marketplace_contract);
                  const willReListOnObjkt = r.state === "reprice" && l.marketplace_contract !== OBJKT_V6_2;
                  const thumb = tok ? ipfsToHttp(tok.thumbnail_uri) ?? ipfsToHttp(tok.display_uri) : null;
                  return (
                    <tr
                      key={l.id}
                      className={`border-t border-zinc-200 dark:border-zinc-800 ${
                        r.state === "cancel"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : r.state === "reprice"
                            ? "bg-blue-50 dark:bg-blue-950/20"
                            : ""
                      } ${cancellable ? "" : "opacity-60"}`}
                    >
                      <td className="px-3 py-2">
                        {tok ? (
                          <a
                            href={objktTokenLink(tok.fa_contract, tok.token_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:underline"
                          >
                            <span className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                              {thumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                              )}
                            </span>
                            <span className="truncate max-w-xs">{tok.name ?? `#${tok.token_id}`}</span>
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {MARKETPLACE_NAMES[l.marketplace_contract] ?? l.marketplace_contract.slice(0, 10) + "…"}
                        {!cancellable && (
                          <div className="text-amber-700 dark:text-amber-400">(unsupported)</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {formatTez(l.price)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                        {l.amount_left}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={r.state}
                          onChange={(e) =>
                            setRow(l.id, { state: e.target.value as ListingState })
                          }
                          disabled={!cancellable}
                          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs"
                        >
                          <option value="keep">keep</option>
                          <option value="cancel">cancel</option>
                          <option value="reprice">reprice</option>
                        </select>
                        {willReListOnObjkt && (
                          <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
                            relist on objkt v6.2
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.000001"
                          step="0.1"
                          value={r.newPriceTez}
                          onChange={(e) => setRow(l.id, { newPriceTez: e.target.value })}
                          disabled={r.state !== "reprice"}
                          placeholder={r.state === "reprice" ? "new price" : ""}
                          className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result && <Result result={result} />}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm batch update"
        confirmLabel={`Sign — ${counts.cancel} cancel${counts.cancel === 1 ? "" : "s"}, ${counts.reprice} repric${counts.reprice === 1 ? "ing" : "ings"}`}
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
        warning={
          <>
            Cancellations are immediate. Re-listings post fresh asks on objkt v6.2 — anyone can buy
            them at the new price. Verify each price below.
          </>
        }
      >
        {planned.cancels.length > 0 && (
          <div className="mb-3">
            <h3 className="font-semibold mb-1 text-red-700 dark:text-red-400">
              Cancel ({planned.cancels.length})
            </h3>
            <ul className="space-y-1">
              {planned.cancels.map((l) => (
                <li key={l.id} className="flex justify-between gap-2 text-xs">
                  <span className="truncate">{l.token?.name ?? `#${l.token?.token_id}`}</span>
                  <span className="text-zinc-500 whitespace-nowrap">{formatTez(l.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {planned.reprices.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-400">
              Reprice ({planned.reprices.length})
            </h3>
            <ul className="space-y-1">
              {planned.reprices.map((l) => {
                const np = Number(rowOf(l.id).newPriceTez);
                return (
                  <li key={l.id} className="flex justify-between gap-2 text-xs">
                    <span className="truncate">{l.token?.name ?? `#${l.token?.token_id}`}</span>
                    <span className="text-zinc-500 whitespace-nowrap">
                      {formatTez(l.price)} → <strong>{np} ꜩ</strong>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Beacon will show the operation params again before final signing.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function ConnectPrompt({ connect, status }: { connect: () => Promise<void>; status: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Connect your wallet to use this tool.</p>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={status === "connecting"}
        className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
      >
        {status === "connecting" ? "Connecting…" : "Connect wallet"}
      </button>
    </div>
  );
}

function Result({ result }: { result: { ok: boolean; message: string } }) {
  return (
    <div
      className={`mt-6 rounded-md p-3 text-sm ${
        result.ok
          ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900"
          : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900"
      }`}
    >
      {result.ok ? (
        <span>
          Sent! Op hash:{" "}
          <a
            href={`https://tzkt.io/${result.message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-mono break-all"
          >
            {result.message}
          </a>
        </span>
      ) : (
        <span>{result.message}</span>
      )}
    </div>
  );
}
