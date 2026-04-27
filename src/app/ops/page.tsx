"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { formatDate, formatTez, shortAddress } from "@/lib/utils";
import type { TzktAccountOp } from "@/lib/tzkt";

export default function OpsPage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<{ address: string; ops: TzktAccountOp[] } | null>(null);

  const loading = !!address && data?.address !== address;
  const ops = data?.address === address ? data.ops : null;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/my-ops?address=${address}&limit=30`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { ops: TzktAccountOp[] }) => {
        if (!cancelled) setData({ address, ops: res.ops });
      })
      .catch(() => {
        if (!cancelled) setData({ address, ops: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Recent Operations</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The last 30 transactions, reveals, and originations originated by your connected wallet.
          Use this after signing something to confirm the op landed without leaving the toolkit.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt status={status} connect={connect} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading your recent ops…</p>
      ) : !ops || ops.length === 0 ? (
        <p className="text-sm text-zinc-500">No operations found for this wallet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
              <tr>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Time</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Op</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Target</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Amount</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Hash</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op) => {
                const ep = op.parameter?.entrypoint;
                const targetAddr = op.target?.address ?? "";
                const targetLabel =
                  MARKETPLACE_NAMES[targetAddr] ??
                  op.target?.alias ??
                  (targetAddr ? shortAddress(targetAddr) : "—");
                const statusColor =
                  op.status === "applied"
                    ? "text-green-700 dark:text-green-400"
                    : op.status === "failed" || op.status === "backtracked"
                      ? "text-red-700 dark:text-red-400"
                      : "text-zinc-500";
                return (
                  <tr key={`${op.type}-${op.id}`} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-3 py-1.5 whitespace-nowrap text-zinc-500 text-xs">
                      {formatDate(op.timestamp)}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                        {op.type}
                        {ep && (
                          <span className="text-zinc-500"> · {ep}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {targetAddr ? (
                        <span title={targetAddr}>{targetLabel}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs">
                      {op.amount ? formatTez(op.amount) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className={`px-3 py-1.5 text-xs ${statusColor}`}>
                      {op.status ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs">
                      <a
                        href={`https://tzkt.io/${op.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        title={op.hash}
                      >
                        {op.hash.slice(0, 10)}…
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConnectPrompt({ connect, status }: { connect: () => Promise<void>; status: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">
        Connect your wallet to see your recent operations.
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
