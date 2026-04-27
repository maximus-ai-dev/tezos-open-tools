"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { formatTez, shortAddress } from "@/lib/utils";
import { MARKETPLACE_NAMES, objktProfileLink } from "@/lib/constants";
import type {
  HoldingsResult,
  OfferActive,
  SellerListing,
} from "@/lib/objkt";
import type { TzktAccountOp } from "@/lib/tzkt";

interface DashboardData {
  address: string;
  holdings: HoldingsResult | null;
  listings: SellerListing[];
  incomingOffers: OfferActive[];
  outgoingOffers: OfferActive[];
  recentOps: TzktAccountOp[];
}

export default function MePage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = !!address && data?.address !== address;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/holdings?address=${address}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/listings?address=${address}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/offers-received?address=${address}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/offers-made?address=${address}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/my-ops?address=${address}&limit=10`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([h, l, oIn, oOut, ops]) => {
        if (cancelled) return;
        setData({
          address,
          holdings: h.holdings,
          listings: l.listings,
          incomingOffers: oIn.offers,
          outgoingOffers: oOut.offers,
          recentOps: ops.ops,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your wallet</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          A snapshot of everything you have on chain right now. One place to land after connecting.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt status={status} connect={connect} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading your dashboard…</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : !data ? null : (
        <Dashboard data={data} />
      )}
    </div>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
  const heldCount = data.holdings?.held.length ?? 0;
  const heldFloorSum =
    data.holdings?.held.reduce(
      (s, h) => s + (h.token.listings_active[0]?.price ?? 0),
      0,
    ) ?? 0;

  const listingsCount = data.listings.length;
  const listingsValue = data.listings.reduce((s, l) => s + l.price, 0);

  const incomingCount = data.incomingOffers.length;
  const incomingValue = data.incomingOffers.reduce(
    (s, o) => s + (o.price_xtz ?? o.price ?? 0),
    0,
  );

  const outgoingCount = data.outgoingOffers.length;
  const outgoingValue = data.outgoingOffers.reduce(
    (s, o) => s + (o.price_xtz ?? o.price ?? 0),
    0,
  );

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <a
          href={objktProfileLink(data.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-zinc-500 hover:underline"
        >
          {data.address}
        </a>
        {data.holdings?.alias && (
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            ({data.holdings.alias})
          </span>
        )}
        <Link
          href={`/wallet/${data.address}`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Share public profile →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <Card label="Tokens held" primary={String(heldCount)} secondary={`floor sum ≈ ${formatTez(heldFloorSum)}`} href="/resale" />
        <Card label="Active listings" primary={String(listingsCount)} secondary={`asking ≈ ${formatTez(listingsValue)}`} href="/artist/sale" />
        <Card label="Offers received" primary={String(incomingCount)} secondary={`if all accepted ≈ ${formatTez(incomingValue)}`} href="/offers/received" />
        <Card label="Offers made" primary={String(outgoingCount)} secondary={`outstanding ≈ ${formatTez(outgoingValue)}`} href="/offers/manage" />
        <Card label="Recent ops" primary={String(data.recentOps.length)} secondary="last 10" href="/ops" />
      </div>

      {data.listings.length > 0 && (
        <Section title="Your listings" href="/artist/sale" linkText="Manage all →">
          <ul className="space-y-1 text-sm">
            {data.listings.slice(0, 5).map((l) => (
              <li key={l.id} className="flex justify-between gap-2 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded">
                <span className="truncate">{l.token?.name ?? `#${l.token?.token_id}`}</span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatTez(l.price)}{" "}
                  <span className="text-xs">
                    on {MARKETPLACE_NAMES[l.marketplace_contract] ?? "marketplace"}
                  </span>
                </span>
              </li>
            ))}
            {data.listings.length > 5 && (
              <li className="text-xs text-zinc-400 italic px-2">+{data.listings.length - 5} more</li>
            )}
          </ul>
        </Section>
      )}

      {data.incomingOffers.length > 0 && (
        <Section title="Incoming offers" href="/artist/offers" linkText="Accept any →">
          <ul className="space-y-1 text-sm">
            {data.incomingOffers.slice(0, 5).map((o) => (
              <li key={o.id} className="flex justify-between gap-2 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded">
                <span className="truncate">{o.token?.name ?? "(collection offer)"}</span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatTez(o.price_xtz ?? o.price)} from{" "}
                  <span className="font-mono text-xs" title={o.buyer_address ?? ""}>
                    {o.buyer?.alias ?? shortAddress(o.buyer_address ?? "")}
                  </span>
                </span>
              </li>
            ))}
            {data.incomingOffers.length > 5 && (
              <li className="text-xs text-zinc-400 italic px-2">+{data.incomingOffers.length - 5} more</li>
            )}
          </ul>
        </Section>
      )}

      {data.outgoingOffers.length > 0 && (
        <Section title="Offers you've made" href="/offers/manage" linkText="Manage all →">
          <ul className="space-y-1 text-sm">
            {data.outgoingOffers.slice(0, 5).map((o) => (
              <li key={o.id} className="flex justify-between gap-2 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded">
                <span className="truncate">{o.token?.name ?? `(collection ${o.fa?.name ?? "offer"})`}</span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatTez(o.price_xtz ?? o.price)}
                </span>
              </li>
            ))}
            {data.outgoingOffers.length > 5 && (
              <li className="text-xs text-zinc-400 italic px-2">+{data.outgoingOffers.length - 5} more</li>
            )}
          </ul>
        </Section>
      )}

      {data.recentOps.length > 0 && (
        <Section title="Recent ops" href="/ops" linkText="Full log →">
          <ul className="space-y-1 text-sm">
            {data.recentOps.slice(0, 5).map((op) => {
              const ep = op.parameter?.entrypoint;
              const t = op.target?.address ?? "";
              const tLabel =
                MARKETPLACE_NAMES[t] ?? op.target?.alias ?? (t ? shortAddress(t) : "—");
              return (
                <li
                  key={`${op.type}-${op.id}`}
                  className="flex justify-between gap-2 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded text-xs"
                >
                  <span className="text-zinc-500">{op.timestamp.slice(0, 10)}</span>
                  <span className="font-mono">
                    {op.type}
                    {ep && <span className="text-zinc-500"> · {ep}</span>}
                  </span>
                  <span className="text-zinc-500 truncate">→ {tLabel}</span>
                  <span
                    className={
                      op.status === "applied"
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }
                  >
                    {op.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          ["/pnl", "P&L"],
          ["/flex", "Flex"],
          ["/gallery", `?address=${data.address}`],
          ["/operators", "Operators"],
          ["/pin", "Pin"],
          ["/migrate/transfer", "Transfer"],
          ["/swap/batch", "Batch swap"],
          ["/giveaway", "Giveaway"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href.startsWith("/gallery") ? `/gallery?address=${data.address}` : href}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-center hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            {label.startsWith("?") ? "Gallery" : label}
          </Link>
        ))}
      </div>
    </>
  );
}

function Card({
  label,
  primary,
  secondary,
  href,
}: {
  label: string;
  primary: string;
  secondary?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{primary}</div>
      {secondary && <div className="text-xs text-zinc-500 mt-0.5">{secondary}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Section({
  title,
  href,
  linkText,
  children,
}: {
  title: string;
  href?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
        {href && linkText && (
          <Link href={href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            {linkText}
          </Link>
        )}
      </div>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">{children}</div>
    </section>
  );
}

function ConnectPrompt({ connect, status }: { connect: () => Promise<void>; status: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">
        Connect your wallet to see your holdings, listings, offers, and recent ops in one place.
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
