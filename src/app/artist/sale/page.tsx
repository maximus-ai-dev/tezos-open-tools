"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { buildCancelBatch, isCancellable, sendBatch } from "@/lib/tezos/operations";
import {
  MARKETPLACE_NAMES,
  objktTokenLink,
} from "@/lib/constants";
import { formatTez, ipfsToHttp } from "@/lib/utils";
import type { SellerListing } from "@/lib/objkt";

export default function ManageSwapsPage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<{ address: string; listings: SellerListing[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllCancellable() {
    if (!listings) return;
    setSelected(new Set(listings.filter((l) => isCancellable(l.marketplace_contract)).map((l) => l.id)));
  }

  const toCancel = useMemo(
    () => (listings ?? []).filter((l) => selected.has(l.id) && l.bigmap_key !== null),
    [listings, selected],
  );

  function tryOpenConfirm() {
    setResult(null);
    if (!listings || !address) return;
    if (toCancel.length === 0) {
      setResult({ ok: false, message: "Select at least one cancellable listing." });
      return;
    }
    setConfirmOpen(true);
  }

  async function cancel() {
    setConfirmOpen(false);
    if (!listings || !address) return;
    setBusy(true);
    try {
      const ops = await buildCancelBatch(
        toCancel.map((l) => ({
          marketplaceContract: l.marketplace_contract,
          bigmapKey: l.bigmap_key as number,
        })),
      );
      const { opHash } = await sendBatch(ops);
      setResult({ ok: true, message: opHash });
      setSelected(new Set());
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
        <h1 className="text-2xl font-semibold tracking-tight">Manage Listings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your active listings across Tezos marketplaces. Select multiple and cancel them in a
          single batched operation. Supported on objkt, HEN v2, and Teia.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt status={status} connect={connect} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading your listings…</p>
      ) : !listings || listings.length === 0 ? (
        <p className="text-sm text-zinc-500">No active listings found for this wallet.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Active listings:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{listings.length}</span>
            </span>
            <button
              type="button"
              onClick={selectAllCancellable}
              className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Select all cancellable
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={tryOpenConfirm}
              disabled={busy || selected.size === 0}
              className="ml-auto px-4 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Signing…" : `Cancel ${selected.size} listing${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Price</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Editions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const tok = l.token;
                  const cancellable = isCancellable(l.marketplace_contract);
                  const thumb = tok ? ipfsToHttp(tok.thumbnail_uri) ?? ipfsToHttp(tok.display_uri) : null;
                  return (
                    <tr
                      key={l.id}
                      className={`border-t border-zinc-200 dark:border-zinc-800 ${
                        selected.has(l.id) ? "bg-blue-50 dark:bg-blue-950/30" : ""
                      } ${cancellable ? "" : "opacity-60"}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          disabled={!cancellable}
                          checked={selected.has(l.id)}
                          onChange={() => toggle(l.id)}
                        />
                      </td>
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
                                <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                              )}
                            </span>
                            <span className="truncate max-w-xs">{tok.name ?? `#${tok.token_id}`}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {MARKETPLACE_NAMES[l.marketplace_contract] ?? l.marketplace_contract.slice(0, 8) + "…"}
                        {!cancellable && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400">
                            (cancel manually)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {formatTez(l.price)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                        {l.amount_left}/{l.amount}
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
        title={`Cancel ${toCancel.length} listing${toCancel.length === 1 ? "" : "s"}?`}
        confirmLabel={`Cancel ${toCancel.length} listing${toCancel.length === 1 ? "" : "s"}`}
        tone="danger"
        busy={busy}
        onConfirm={() => void cancel()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p className="mb-3 text-zinc-700 dark:text-zinc-300">
          The marketplace will reject any new buys at these prices. You can re-list later from{" "}
          <a className="underline" href="/swap/batch">Batch Swap</a> or directly on objkt.
        </p>
        <ul className="space-y-1">
          {toCancel.map((l) => (
            <li key={l.id} className="flex justify-between gap-2 text-xs">
              <span className="truncate">{l.token?.name ?? `#${l.token?.token_id}`}</span>
              <span className="text-zinc-500 whitespace-nowrap">
                {MARKETPLACE_NAMES[l.marketplace_contract] ?? "marketplace"} ·{" "}
                {formatTez(l.price)}
              </span>
            </li>
          ))}
        </ul>
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
