"use client";

import { useEffect, useState } from "react";
import { formatDate, shortAddress } from "@/lib/utils";

interface HeadData {
  level: number;
  hash: string;
  timestamp: string;
  cycle: number;
  protocol: string;
  synced: boolean;
}

interface BlockData {
  level: number;
  hash: string;
  timestamp: string;
  proposer?: { alias?: string | null; address: string } | null;
  transactionsCount?: number;
}

interface ApiResponse {
  head: HeadData | null;
  blocks: BlockData[];
  fetchedAt: string;
}

export default function MempoolPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetch("/api/head", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: ApiResponse) => {
          if (!cancelled) {
            setData(d);
            setErrored(false);
          }
        })
        .catch(() => {
          if (!cancelled) setErrored(true);
        });
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Gas Station</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tezos network status — current head, last 15 blocks, refreshed every 8 seconds.
        </p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Note: this shows confirmed blocks. True mempool watching (pending operations before
          inclusion) needs a node-level connection that&apos;s not wired up yet.
        </p>
      </header>

      <div className="flex items-center gap-2 mb-6 text-sm">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            errored ? "bg-red-500" : "bg-green-500 animate-pulse"
          }`}
        />
        <span className="text-zinc-600 dark:text-zinc-400">
          {errored ? "Connection error" : data ? "Live" : "Connecting…"}
        </span>
      </div>

      {data?.head && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Level" value={data.head.level.toLocaleString()} />
          <Stat label="Cycle" value={String(data.head.cycle)} />
          <Stat label="Synced" value={data.head.synced ? "yes" : "no"} />
          <Stat label="Updated" value={formatDate(data.fetchedAt)} />
        </div>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
        Recent blocks
      </h2>
      {!data ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : data.blocks.length === 0 ? (
        <p className="text-sm text-zinc-500">No blocks.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
              <tr>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Level</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Time</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Proposer</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                  Txs
                </th>
              </tr>
            </thead>
            <tbody>
              {data.blocks.map((b) => (
                <tr key={b.level} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-1.5 font-mono">
                    <a
                      href={`https://tzkt.io/${b.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {b.level.toLocaleString()}
                    </a>
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500">{formatDate(b.timestamp)}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {b.proposer
                      ? b.proposer.alias ?? shortAddress(b.proposer.address)
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {b.transactionsCount ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
