"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { buildBulkBuy, sendBatch } from "@/lib/tezos/operations";
import { objktTokenLink } from "@/lib/constants";
import { formatTez, ipfsToHttp, parseContractInput } from "@/lib/utils";
import type { FloorListing } from "@/lib/objkt";

const OBJKT_V62 = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";

export default function SweepPage() {
  const { address, status, connect } = useWallet();
  const [faInput, setFaInput] = useState("");
  const [fa, setFa] = useState<string | null>(null);
  const [listings, setListings] = useState<FloorListing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function load() {
    setResult(null);
    const parsed = parseContractInput(faInput);
    if (!parsed) {
      setResult({ ok: false, message: "Couldn't parse a contract address." });
      return;
    }
    setFa(parsed);
  }

  useEffect(() => {
    if (!fa) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/floor?fa=${fa}&limit=60`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { listings: FloorListing[] }) => {
        if (cancelled) return;
        // Bulk-buy only works on objkt v6.2 — filter the rest out.
        const supported = d.listings.filter(
          (l) => l.marketplace_contract === OBJKT_V62 && l.bigmap_key !== null,
        );
        setListings(supported);
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fa]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectCheapest(n: number) {
    if (!listings) return;
    setSelected(new Set(listings.slice(0, n).map((l) => l.id)));
  }

  const selectedListings = useMemo(
    () => (listings ?? []).filter((l) => selected.has(l.id)),
    [listings, selected],
  );

  const totalCostMutez = useMemo(
    () => selectedListings.reduce((s, l) => s + l.price, 0),
    [selectedListings],
  );

  async function sweep() {
    setConfirmOpen(false);
    if (!address || selectedListings.length === 0) return;
    setBusy(true);
    try {
      const ops = await buildBulkBuy(
        address,
        selectedListings.map((l) => ({
          askId: l.bigmap_key as number,
          amount: 1,
          priceMutez: l.price,
        })),
        false,
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
        <h1 className="text-2xl font-semibold tracking-tight">Floor Sweep</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Buy multiple cheap listings in one signed transaction. Targets objkt v6.2&apos;s{" "}
          <code className="text-xs font-mono">fulfill_ask_bulk</code> entrypoint — N asks resolved
          atomically (or partially, if the marketplace allows).
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Listings on other marketplaces (HEN, Teia, fxhash, Versum) are filtered out of the sweep
          set — they don&apos;t expose a bulk-buy entrypoint, so you&apos;d have to use individual
          Buy buttons on those.
        </p>
      </header>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={faInput}
          onChange={(e) => setFaInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="KT1... contract or objkt collection URL"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={load}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Load
        </button>
      </div>

      {!address ? (
        <ConnectPrompt status={status} connect={connect} />
      ) : !fa ? (
        <p className="text-sm text-zinc-500">Paste a collection contract above to load floor listings.</p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading listings…</p>
      ) : !listings || listings.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No active objkt v6.2 listings on this contract.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Sweepable listings:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{listings.length}</span>
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => selectCheapest(5)} className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                Cheapest 5
              </button>
              <button type="button" onClick={() => selectCheapest(10)} className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                Cheapest 10
              </button>
              <button type="button" onClick={() => selectCheapest(listings.length)} className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                All ({listings.length})
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                Clear
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={busy || selected.size === 0}
              className="ml-auto px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy
                ? "Signing…"
                : selected.size === 0
                  ? "Select listings to sweep"
                  : `Sweep ${selected.size} for ${formatTez(totalCostMutez)}`}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {listings.map((l) => {
              const tok = l.token!;
              const thumb = ipfsToHttp(tok.thumbnail_uri) ?? ipfsToHttp(tok.display_uri);
              const isSelected = selected.has(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  className={`text-left rounded-lg border overflow-hidden transition-colors ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 relative">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="p-2 text-xs">
                    <div className="font-medium truncate">{tok.name ?? `#${tok.token_id}`}</div>
                    <div className="text-zinc-500">{formatTez(l.price)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {result && (
            <div
              className={`mt-4 rounded-md p-3 text-sm ${
                result.ok
                  ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900"
              }`}
            >
              {result.ok ? (
                <span>
                  Sent! Op:{" "}
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
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Sweep ${selected.size} listing${selected.size === 1 ? "" : "s"}?`}
        confirmLabel={`Sign — buy ${selected.size} for ${formatTez(totalCostMutez)}`}
        busy={busy}
        onConfirm={() => void sweep()}
        onCancel={() => setConfirmOpen(false)}
        warning={
          <>
            Non-atomic sweep: if some listings get sniped before your tx lands, the rest still go
            through — you only pay for what you actually buy. Total upper bound is{" "}
            <strong>{formatTez(totalCostMutez)}</strong> + ~0.05 ꜩ gas.
          </>
        }
      >
        <ul className="space-y-1 text-xs">
          {selectedListings.slice(0, 20).map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span className="truncate">{l.token?.name ?? `#${l.token?.token_id}`}</span>
              <span className="text-zinc-500 whitespace-nowrap">
                <a
                  href={objktTokenLink(l.token!.fa_contract, l.token!.token_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {formatTez(l.price)}
                </a>
              </span>
            </li>
          ))}
          {selectedListings.length > 20 && (
            <li className="text-zinc-400 italic">… and {selectedListings.length - 20} more</li>
          )}
        </ul>
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
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Connect your wallet to sweep.</p>
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
