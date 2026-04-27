"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTez, parseContractInput, shortAddress } from "@/lib/utils";

interface OpRow {
  id: number;
  level: number;
  timestamp: string;
  hash: string;
  sender: { alias?: string | null; address: string };
  amount: number;
  status: string;
  parameter?: { entrypoint: string } | null;
}

interface ApiResponse {
  ops: OpRow[];
}

export default function DropAnalysisPage() {
  const [target, setTarget] = useState("");
  const [parsed, setParsed] = useState<string | null>(null);
  const [data, setData] = useState<{ target: string; ops: OpRow[] } | null>(null);

  useEffect(() => {
    if (!parsed) return;
    let cancelled = false;
    const tick = () => {
      fetch(`/api/drop?target=${parsed}&limit=100`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: ApiResponse) => {
          if (!cancelled) setData({ target: parsed, ops: d.ops });
        })
        .catch(() => {
          /* keep showing prior data */
        });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [parsed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseContractInput(target);
    setParsed(p);
  }

  const ops = data?.target === parsed ? data.ops : null;
  const stats = ops
    ? {
        total: ops.length,
        unique: new Set(ops.map((o) => o.sender.address)).size,
        volume: ops.reduce((s, o) => s + o.amount, 0),
        applied: ops.filter((o) => o.status === "applied").length,
        failed: ops.filter((o) => o.status !== "applied").length,
        entrypoints: countBy(ops, (o) => o.parameter?.entrypoint ?? "(default)"),
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Drop Analysis</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Live operations targeting a contract — useful when watching a mint, claim, or sale go
          live. Refreshes every 5 seconds.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="KT1... contract or objkt collection URL"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Watch
        </button>
      </form>

      {target && !parsed && target.length > 5 && (
        <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t parse a contract address.</p>
      )}

      {parsed && stats && ops && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <Stat label="Ops shown" value={String(stats.total)} />
            <Stat label="Unique senders" value={String(stats.unique)} />
            <Stat label="Tez moved" value={formatTez(stats.volume)} />
            <Stat label="Applied" value={String(stats.applied)} />
            <Stat label="Failed" value={String(stats.failed)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
              <h3 className="px-3 py-2 text-sm font-semibold border-b border-zinc-200 dark:border-zinc-800">
                Entrypoints
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(stats.entrypoints)
                    .sort((a, b) => b[1] - a[1])
                    .map(([ep, n]) => (
                      <tr key={ep} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="px-3 py-1.5 font-mono text-xs">{ep}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{n}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
              <h3 className="px-3 py-2 text-sm font-semibold border-b border-zinc-200 dark:border-zinc-800">
                Recent operations
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {ops.slice(0, 20).map((o) => (
                    <tr key={o.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-1.5 text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(o.timestamp)}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {o.sender.alias ?? shortAddress(o.sender.address)}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {o.parameter?.entrypoint ?? "(default)"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs">
                        {o.amount > 0 ? formatTez(o.amount) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {parsed && (!ops || ops.length === 0) && (
        <p className="text-sm text-zinc-500">No recent operations targeting {parsed}.</p>
      )}
    </div>
  );
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

