"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { formatTez, ipfsToHttp, isTezosAddress } from "@/lib/utils";
import { MARKETPLACE_NAMES, objktTokenLink } from "@/lib/constants";
import type { PnlResult, PnlRow } from "@/app/api/pnl/route";

type SortKey = "pnl" | "pnl_pct" | "cost" | "floor" | "name";

export default function PnlPage() {
  const { address: connected } = useWallet();
  const [address, setAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const q = new URL(window.location.href).searchParams.get("address");
    return q && isTezosAddress(q) ? q : null;
  });
  const [data, setData] = useState<PnlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hideUnpriced, setHideUnpriced] = useState(false);

  // Adopt the connected wallet once it shows up, only if no explicit ?address= was given.
  useEffect(() => {
    if (connected && !address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress(connected);
    }
  }, [connected, address]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/pnl?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { pnl: PnlResult | null }) => {
        if (cancelled) return;
        if (!d.pnl) setError("No data for this wallet.");
        else setData(d.pnl);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = hideUnpriced
      ? data.rows.filter((r) => r.cost_basis_mutez !== null && r.floor_mutez !== null)
      : [...data.rows];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = pickSort(a, sortKey);
      const bv = pickSort(b, sortKey);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return rows;
  }, [data, sortKey, sortDir, hideUnpriced]);

  function header(label: string, key: SortKey, align: "left" | "right" = "right") {
    const active = sortKey === key;
    return (
      <button
        type="button"
        onClick={() => {
          if (active) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setSortKey(key);
            setSortDir("desc");
          }
        }}
        className={`px-2 py-1 text-xs uppercase tracking-wider hover:text-zinc-900 dark:hover:text-zinc-100 ${
          align === "right" ? "text-right" : "text-left"
        } ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
      >
        {label}
        {active && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">P&amp;L</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cost basis vs current floor for tokens you still hold. Cost basis = your most recent
          on-chain buy price for that token. Mints, free claims, and gifts show as <em>?</em>.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Floor is the cheapest active listing on that exact token (any marketplace). Unrealized only
          — sales already made aren&apos;t counted.
        </p>
      </header>

      <WalletInputForm action="/pnl" initial={address ?? ""} />

      {!address ? null : loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading P&amp;L…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : !data ? null : (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Cost basis" value={formatTez(data.totals.cost)} sub={`${data.totals.priced} tokens`} />
            <Stat label="Floor sum" value={formatTez(data.totals.floor)} />
            <Stat
              label="Unrealized P&L"
              value={formatTez(data.totals.pnl)}
              tone={data.totals.pnl >= 0 ? "pos" : "neg"}
              sub={
                data.totals.cost > 0
                  ? `${((data.totals.pnl / data.totals.cost) * 100).toFixed(1)}%`
                  : undefined
              }
            />
            <Stat
              label="No cost basis"
              value={String(data.totals.unpriced)}
              sub="mint / gift / pre-objkt"
            />
          </div>

          <div className="mt-6 mb-3 flex items-center justify-between text-xs text-zinc-500">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideUnpriced}
                onChange={(e) => setHideUnpriced(e.target.checked)}
              />
              Hide rows with no cost basis or no floor
            </label>
            <span>
              {sorted.length} row{sorted.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <th className="text-left">{header("Token", "name", "left")}</th>
                  <th className="text-right">{header("Cost", "cost")}</th>
                  <th className="text-right">{header("Floor", "floor")}</th>
                  <th className="text-right">{header("P&L", "pnl")}</th>
                  <th className="text-right">{header("%", "pnl_pct")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <Row key={`${r.fa_contract}:${r.token_id}`} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function pickSort(r: PnlRow, key: SortKey): number | string | null {
  switch (key) {
    case "pnl":
      return r.pnl_mutez;
    case "pnl_pct":
      return r.pnl_pct;
    case "cost":
      return r.cost_basis_mutez;
    case "floor":
      return r.floor_mutez;
    case "name":
      return r.name ?? r.token_id;
  }
}

function Row({ row }: { row: PnlRow }) {
  const thumb = ipfsToHttp(row.thumbnail_uri) ?? ipfsToHttp(row.display_uri);
  const tone =
    row.pnl_mutez === null
      ? ""
      : row.pnl_mutez > 0
        ? "text-green-700 dark:text-green-400"
        : row.pnl_mutez < 0
          ? "text-red-700 dark:text-red-400"
          : "text-zinc-500";
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-900 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-950">
      <td className="px-2 py-2">
        <a
          href={objktTokenLink(row.fa_contract, row.token_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:underline"
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="w-10 h-10 rounded object-cover bg-zinc-100 dark:bg-zinc-900" loading="lazy" />
          ) : (
            <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-900" />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name ?? `#${row.token_id}`}</div>
            <div className="text-xs text-zinc-500 truncate">
              {row.fa_name ?? row.fa_contract.slice(0, 10)}
              {row.quantity > 1 && <span className="ml-2">×{row.quantity}</span>}
            </div>
          </div>
        </a>
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {row.cost_basis_mutez !== null ? (
          <span title={row.cost_basis_at?.slice(0, 10) ?? ""}>{formatTez(row.cost_basis_mutez)}</span>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {row.floor_mutez !== null ? (
          <span title={MARKETPLACE_NAMES[row.floor_marketplace ?? ""] ?? row.floor_marketplace ?? ""}>
            {formatTez(row.floor_mutez)}
          </span>
        ) : (
          <span className="text-zinc-400">unlisted</span>
        )}
      </td>
      <td className={`px-2 py-2 text-right whitespace-nowrap font-medium ${tone}`}>
        {row.pnl_mutez !== null ? (
          <>
            {row.pnl_mutez > 0 ? "+" : ""}
            {formatTez(row.pnl_mutez)}
          </>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className={`px-2 py-2 text-right whitespace-nowrap ${tone}`}>
        {row.pnl_pct !== null ? (
          <>
            {row.pnl_pct > 0 ? "+" : ""}
            {row.pnl_pct.toFixed(0)}%
          </>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  const toneCls =
    tone === "pos"
      ? "text-green-700 dark:text-green-400"
      : tone === "neg"
        ? "text-red-700 dark:text-red-400"
        : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
