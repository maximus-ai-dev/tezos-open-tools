"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { buildRevokeOperatorsBatch, sendBatch } from "@/lib/tezos/operations";
import {
  MARKETPLACE_NAMES,
  objktTokenLink,
} from "@/lib/constants";
import type { OperatorGrant } from "@/lib/objkt";
import { shortAddress } from "@/lib/utils";

export default function OperatorsPage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<{ address: string; grants: OperatorGrant[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loading = !!address && data?.address !== address;
  const grants = data?.address === address ? data.grants : null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/operators?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { grants: OperatorGrant[] }) => {
        if (!cancelled) setData({ address, grants: res.grants });
      })
      .catch(() => {
        if (!cancelled) setData({ address, grants: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Group grants by operator for an at-a-glance summary at the top.
  const grouped = useMemo(() => {
    if (!grants) return null;
    const m = new Map<string, OperatorGrant[]>();
    for (const g of grants) {
      const arr = m.get(g.operator_address) ?? [];
      arr.push(g);
      m.set(g.operator_address, arr);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [grants]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllForOperator(opAddr: string) {
    if (!grants) return;
    const ids = grants
      .filter((g) => g.operator_address === opAddr && g.token)
      .map((g) => g.id);
    setSelected((s) => {
      const next = new Set(s);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function revoke() {
    setConfirmOpen(false);
    if (!address || !grants) return;
    const toRevoke = grants.filter((g) => selected.has(g.id) && g.token);
    if (toRevoke.length === 0) {
      setResult({ ok: false, message: "Select at least one grant." });
      return;
    }
    setBusy(true);
    try {
      const ops = await buildRevokeOperatorsBatch(
        address,
        toRevoke.map((g) => ({
          fa: g.token!.fa_contract,
          tokenId: g.token!.token_id,
          operatorAddress: g.operator_address,
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
        <h1 className="text-2xl font-semibold tracking-tight">Operator Approvals</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every contract you&apos;ve granted permission to move your tokens. Listing on a
          marketplace adds an operator approval; cancelling the listing does not always remove it.
          Stale approvals are a security tail risk — anyone who finds a bug in an old marketplace
          contract you&apos;re still authorising can drain that token.
        </p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Revoking will mean if you re-list later, the marketplace will need a fresh approval.
          That&apos;s fine — it just adds one extra signing step.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt status={status} connect={connect} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading active operator grants…</p>
      ) : !grants || grants.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No active FA2 operator approvals on this wallet.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Active approvals:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{grants.length}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set(grants.filter((g) => g.token).map((g) => g.id)))}
              className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Select all
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
              onClick={() => setConfirmOpen(true)}
              disabled={busy || selected.size === 0}
              className="ml-auto px-4 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Signing…" : `Revoke ${selected.size} approval${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>

          {/* Operator summary bar */}
          {grouped && grouped.length > 1 && (
            <div className="mb-4 rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">By operator</h3>
              <ul className="text-sm space-y-1">
                {grouped.map(([op, gs]) => (
                  <li key={op} className="flex justify-between gap-2 items-center">
                    <span className="font-mono text-xs">
                      {MARKETPLACE_NAMES[op] ? (
                        <span>
                          <span className="text-zinc-900 dark:text-zinc-100">{MARKETPLACE_NAMES[op]}</span>{" "}
                          <span className="text-zinc-500">({shortAddress(op)})</span>
                        </span>
                      ) : (
                        <span title={op}>{shortAddress(op)}</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{gs.length} grant{gs.length === 1 ? "" : "s"}</span>
                      <button
                        type="button"
                        onClick={() => selectAllForOperator(op)}
                        className="text-[11px] px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        Select all
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Operator</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => {
                  const tok = g.token;
                  const opName = MARKETPLACE_NAMES[g.operator_address];
                  return (
                    <tr
                      key={g.id}
                      className={`border-t border-zinc-200 dark:border-zinc-800 ${
                        selected.has(g.id) ? "bg-red-50 dark:bg-red-950/20" : ""
                      } ${tok ? "" : "opacity-50"}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          disabled={!tok}
                          checked={selected.has(g.id)}
                          onChange={() => toggle(g.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {tok ? (
                          <a
                            href={objktTokenLink(tok.fa_contract, tok.token_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate block max-w-xs"
                          >
                            {tok.name ?? `#${tok.token_id}`}
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {opName ? (
                          <span>
                            <span className="text-zinc-900 dark:text-zinc-100">{opName}</span>{" "}
                            <span className="text-zinc-500" title={g.operator_address}>
                              ({shortAddress(g.operator_address)})
                            </span>
                          </span>
                        ) : (
                          <span title={g.operator_address}>{shortAddress(g.operator_address)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
        title={`Revoke ${selected.size} approval${selected.size === 1 ? "" : "s"}?`}
        confirmLabel={`Revoke ${selected.size}`}
        tone="danger"
        busy={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirmOpen(false)}
        warning={
          <>
            Active listings on revoked marketplaces will become un-fulfillable until you re-grant.
            If you have an open listing on a marketplace and revoke its operator, no buyer can
            collect it until you re-list.
          </>
        }
      >
        <p className="text-zinc-700 dark:text-zinc-300">
          You&apos;re removing FA2 operator rights from {selected.size}{" "}
          (token, operator) pair{selected.size === 1 ? "" : "s"}. The wallet will sign one
          update_operators per FA contract involved.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function ConnectPrompt({ connect, status }: { connect: () => Promise<void>; status: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">
        Connect your wallet to see your active operator approvals.
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
  );
}
