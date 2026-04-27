"use client";

import { useEffect, useState } from "react";
import { getSavedAddresses } from "@/lib/savedAddresses";
import { formatTez, ipfsToHttp, shortAddress } from "@/lib/utils";
import { objktTokenLink, MARKETPLACE_NAMES } from "@/lib/constants";
import type { SaleEvent } from "@/lib/objkt";

const SEEN_KEY = "ttk:meWatchSeen";

export function WatchlistFeed() {
  const [events, setEvents] = useState<SaleEvent[] | null>(null);
  const [watching, setWatching] = useState<number>(0);
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    const saved = getSavedAddresses();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatching(saved.length);
    if (saved.length === 0) {
      setEvents([]);
      return;
    }
    const seen = window.localStorage.getItem(SEEN_KEY);
    setSince(seen);
    const addresses = saved.map((s) => s.address).join(",");
    const url = `/api/watch-feed?addresses=${encodeURIComponent(addresses)}${
      seen ? `&since=${encodeURIComponent(seen)}` : ""
    }`;
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { events: SaleEvent[] }) => {
        if (!cancelled) setEvents(d.events);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function markRead() {
    const now = new Date().toISOString();
    window.localStorage.setItem(SEEN_KEY, now);
    setEvents([]);
    setSince(now);
  }

  if (watching === 0) return null;
  if (events === null) return null;

  if (events.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Watchlist activity
        </h2>
        <p className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm text-zinc-500">
          Nothing new from your {watching} watched wallet{watching === 1 ? "" : "s"}
          {since ? ` since ${since.slice(0, 10)}` : " in the last 7 days"}.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Watchlist activity{" "}
          <span className="text-zinc-900 dark:text-zinc-100">({events.length})</span>
        </h2>
        <button
          type="button"
          onClick={markRead}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Mark all read →
        </button>
      </div>
      <p className="text-xs text-zinc-500 mb-2">
        Sales involving your {watching} watched wallet
        {watching === 1 ? "" : "s"}
        {since ? ` since you last cleared (${since.slice(0, 10)})` : " over the past 7 days"}.
      </p>
      <ul className="space-y-1 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 max-h-96 overflow-y-auto">
        {events.slice(0, 50).map((e) => (
          <FeedRow key={e.id} event={e} />
        ))}
        {events.length > 50 && (
          <li className="text-xs text-zinc-400 italic px-2">
            +{events.length - 50} more — clear and check back later for the rest
          </li>
        )}
      </ul>
    </section>
  );
}

function FeedRow({ event }: { event: SaleEvent }) {
  const thumb = ipfsToHttp(event.token?.thumbnail_uri ?? null) ?? ipfsToHttp(event.token?.display_uri ?? null);
  const market = event.marketplace_contract
    ? MARKETPLACE_NAMES[event.marketplace_contract] ?? "marketplace"
    : "marketplace";
  return (
    <li className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="w-8 h-8 rounded object-cover bg-zinc-100 dark:bg-zinc-900 shrink-0" loading="lazy" />
      ) : (
        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <a
          href={event.token ? objktTokenLink(event.token.fa_contract, event.token.token_id) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium truncate hover:underline block"
        >
          {event.token?.name ?? `#${event.token?.token_id ?? "?"}`}
        </a>
        <div className="text-xs text-zinc-500 truncate">
          {shortAddress(event.seller_address ?? "")} → {shortAddress(event.buyer_address ?? "")}
          <span className="ml-2">{market}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm whitespace-nowrap">{formatTez(event.price_xtz ?? event.price)}</div>
        <div className="text-xs text-zinc-500 whitespace-nowrap">{event.timestamp.slice(0, 10)}</div>
      </div>
    </li>
  );
}
