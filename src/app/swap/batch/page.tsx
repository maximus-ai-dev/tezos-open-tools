"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { buildBatchListings, sendBatch } from "@/lib/tezos/operations";
import type { HoldingsResult, HeldToken } from "@/lib/objkt";
import { ipfsToHttp, formatTez } from "@/lib/utils";

interface ListingRow {
  fa: string;
  tokenId: string;
  name: string | null;
  thumb: string | null;
  heldQty: number;
  alreadyListedQty: number;
  priceTez: string;
  editions: string;
}

export default function BatchSwapPage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<{ address: string; holdings: HoldingsResult | null } | null>(null);
  const [pending, setPending] = useState<Map<string, ListingRow>>(new Map());
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loading = !!address && data?.address !== address;
  const holdings = data?.address === address ? data.holdings : null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/holdings?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { holdings: HoldingsResult | null }) => {
        if (!cancelled) setData({ address, holdings: d.holdings });
      })
      .catch(() => {
        if (!cancelled) setData({ address, holdings: null });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  function keyOf(h: HeldToken): string {
    return `${h.token.fa_contract}:${h.token.token_id}`;
  }

  function addRow(h: HeldToken) {
    const k = keyOf(h);
    if (pending.has(k)) return;
    const row: ListingRow = {
      fa: h.token.fa_contract,
      tokenId: h.token.token_id,
      name: h.token.name,
      thumb: ipfsToHttp(h.token.thumbnail_uri) ?? ipfsToHttp(h.token.display_uri),
      heldQty: Number(h.quantity),
      alreadyListedQty: 0, // could enrich via /api/listings, but heldQty is the cap
      priceTez: "1",
      editions: "1",
    };
    setPending((p) => new Map(p).set(k, row));
  }

  function removeRow(k: string) {
    setPending((p) => {
      const next = new Map(p);
      next.delete(k);
      return next;
    });
  }

  function updateRow(k: string, patch: Partial<ListingRow>) {
    setPending((p) => {
      const cur = p.get(k);
      if (!cur) return p;
      const next = new Map(p);
      next.set(k, { ...cur, ...patch });
      return next;
    });
  }

  function validate(): { ok: boolean; reason?: string } {
    if (!address) return { ok: false, reason: "Connect wallet first." };
    if (pending.size === 0) return { ok: false, reason: "Add at least one token to list." };
    for (const r of pending.values()) {
      const price = Number(r.priceTez);
      if (!Number.isFinite(price) || price <= 0)
        return { ok: false, reason: `Bad price for ${r.name ?? r.tokenId}` };
      const eds = Number(r.editions);
      if (!Number.isInteger(eds) || eds < 1 || eds > r.heldQty)
        return { ok: false, reason: `Bad edition count for ${r.name ?? r.tokenId} (held ${r.heldQty})` };
    }
    return { ok: true };
  }

  function tryOpenConfirm() {
    setResult(null);
    const v = validate();
    if (!v.ok) {
      setResult({ ok: false, message: v.reason ?? "Invalid input" });
      return;
    }
    setConfirmOpen(true);
  }

  async function send() {
    setConfirmOpen(false);
    setBusy(true);
    try {
      const listings = [...pending.values()].map((r) => ({
        fa: r.fa,
        tokenId: r.tokenId,
        priceMutez: Math.round(Number(r.priceTez) * 1_000_000),
        editions: Number(r.editions),
      }));
      const ops = await buildBatchListings(address!, listings);
      const { opHash } = await sendBatch(ops);
      setResult({ ok: true, message: opHash });
      setPending(new Map());
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    } finally {
      setBusy(false);
    }
  }

  const totalEditions = useMemo(
    () => [...pending.values()].reduce((s, r) => s + (Number(r.editions) || 0), 0),
    [pending],
  );
  const totalIfAllSold = useMemo(
    () =>
      [...pending.values()].reduce(
        (s, r) => s + (Number(r.priceTez) || 0) * (Number(r.editions) || 0),
        0,
      ),
    [pending],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Batch Swap</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          List many tokens for sale on objkt v6.2 in a single signing prompt. Each row creates one
          ask; we add operator approval for the marketplace per FA contract automatically.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Note: operator approvals are left in place after listing so the marketplace can settle
          buys. To revoke, cancel all listings + remove operator manually in your wallet.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt connect={connect} status={status} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading your holdings…</p>
      ) : !holdings || holdings.held.length === 0 ? (
        <p className="text-sm text-zinc-500">No tokens held by this wallet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Your holdings ({holdings.held.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {holdings.held.map((h) => {
                const k = `${h.token.fa_contract}:${h.token.token_id}`;
                const inPending = pending.has(k);
                const thumb =
                  ipfsToHttp(h.token.thumbnail_uri) ?? ipfsToHttp(h.token.display_uri);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => (inPending ? removeRow(k) : addRow(h))}
                    className={`text-left rounded-md border overflow-hidden transition ${
                      inPending
                        ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-900">
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="p-2 text-xs">
                      <div className="font-medium truncate">{h.token.name ?? `#${h.token.token_id}`}</div>
                      <div className="text-zinc-500">held: {h.quantity}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              To list ({pending.size})
            </h2>
            {pending.size === 0 ? (
              <p className="text-sm text-zinc-500 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
                Click tokens on the left to add them.
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {[...pending.values()].map((r) => {
                    const k = `${r.fa}:${r.tokenId}`;
                    return (
                      <div
                        key={k}
                        className="rounded-md border border-zinc-200 dark:border-zinc-800 p-2 flex gap-2 items-center text-sm"
                      >
                        <div className="w-12 h-12 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                          {r.thumb && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.thumb} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-xs font-medium">
                            {r.name ?? `#${r.tokenId}`}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <input
                              type="number"
                              min="0.000001"
                              step="0.1"
                              value={r.priceTez}
                              onChange={(e) => updateRow(k, { priceTez: e.target.value })}
                              className="w-20 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-1.5 py-0.5 text-xs"
                            />
                            <span className="text-xs text-zinc-500 self-center">ꜩ ×</span>
                            <input
                              type="number"
                              min="1"
                              max={r.heldQty}
                              value={r.editions}
                              onChange={(e) => updateRow(k, { editions: e.target.value })}
                              className="w-12 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-1.5 py-0.5 text-xs"
                            />
                            <span className="text-xs text-zinc-500 self-center">/{r.heldQty}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(k)}
                          className="shrink-0 w-6 h-6 rounded-full hover:bg-red-100 dark:hover:bg-red-950 text-zinc-400 hover:text-red-600"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-zinc-500 space-y-1">
                  <div>{pending.size} ask op{pending.size === 1 ? "" : "s"} + operator approval per FA contract</div>
                  <div>{totalEditions} total editions on sale</div>
                  <div>Sum if all sold: {formatTez(totalIfAllSold * 1_000_000)}</div>
                </div>
                <button
                  type="button"
                  onClick={tryOpenConfirm}
                  disabled={busy}
                  className="mt-3 w-full px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Signing…" : `List ${pending.size} token${pending.size === 1 ? "" : "s"}`}
                </button>
                {result && <Result result={result} />}
              </>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`List ${pending.size} token${pending.size === 1 ? "" : "s"}?`}
        confirmLabel={`List ${pending.size} token${pending.size === 1 ? "" : "s"}`}
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
        warning={
          <>
            Listing grants the marketplace operator rights on each token. Buyers can purchase any
            edition at the listed price until you cancel.
          </>
        }
      >
        <p className="mb-3 text-zinc-700 dark:text-zinc-300">
          {pending.size} ask op{pending.size === 1 ? "" : "s"} on objkt v6.2 + operator approval per
          FA contract. Total potential proceeds:{" "}
          <strong>{formatTez(totalIfAllSold * 1_000_000)}</strong> if every edition sells.
        </p>
        <ul className="space-y-2">
          {[...pending.values()].map((r) => {
            const k = `${r.fa}:${r.tokenId}`;
            return (
              <li
                key={k}
                className="flex items-center gap-3 p-2 rounded border border-zinc-200 dark:border-zinc-800"
              >
                <span className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                  {r.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">
                    {r.name ?? `#${r.tokenId}`}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {r.editions} edition{Number(r.editions) === 1 ? "" : "s"} ×{" "}
                    {Number(r.priceTez).toLocaleString()} ꜩ
                  </div>
                </div>
                <div className="font-semibold whitespace-nowrap">
                  {(Number(r.priceTez) * Number(r.editions)).toLocaleString()} ꜩ
                </div>
              </li>
            );
          })}
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
      className={`mt-3 rounded-md p-3 text-xs ${
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
            {result.message.slice(0, 16)}…
          </a>
        </span>
      ) : (
        <span>{result.message}</span>
      )}
    </div>
  );
}
