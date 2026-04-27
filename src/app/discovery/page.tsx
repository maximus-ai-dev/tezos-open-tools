import { getAccountTokenTransfers } from "@/lib/tzkt";
import type { TzktTransfer } from "@/lib/tzkt";
import { getSalesByBuyer, getSalesBySeller } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { WatchButton } from "@/components/common/WatchButton";
import { objktProfileLink } from "@/lib/constants";
import { formatTez, isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function DiscoveryPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);
  return (
    <PageShell
      title="Linked Wallets"
      description="Wallets that frequently exchange NFTs with this address — useful for spotting alts and trading partners."
    >
      <WalletInputForm action="/discovery" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && (
        <>
          <TradePartners address={address!} />
          <Counterparties address={address!} />
        </>
      )}
    </PageShell>
  );
}

interface TradePartnerRow {
  address: string;
  alias: string | null;
  bought_count: number;
  bought_value: number; // mutez paid by us to them
  sold_count: number;
  sold_value: number; // mutez received from them
  net: number; // received - paid
  last_at: string;
}

async function TradePartners({ address }: { address: string }) {
  const [buys, sells] = await Promise.all([
    getSalesByBuyer(address, { limit: 2000 }).catch(() => []),
    getSalesBySeller(address, { limit: 2000 }).catch(() => []),
  ]);
  if (buys.length === 0 && sells.length === 0) return null;

  const map = new Map<string, TradePartnerRow>();
  for (const s of buys) {
    const other = s.seller_address;
    if (!other || other === address) continue;
    const price = s.price_xtz ?? s.price ?? 0;
    const row = map.get(other) ?? {
      address: other,
      alias: null,
      bought_count: 0,
      bought_value: 0,
      sold_count: 0,
      sold_value: 0,
      net: 0,
      last_at: s.timestamp,
    };
    row.bought_count += 1;
    row.bought_value += price;
    row.net -= price;
    if (s.timestamp > row.last_at) row.last_at = s.timestamp;
    map.set(other, row);
  }
  for (const s of sells) {
    const other = s.buyer_address;
    if (!other || other === address) continue;
    const price = s.price_xtz ?? s.price ?? 0;
    const row = map.get(other) ?? {
      address: other,
      alias: null,
      bought_count: 0,
      bought_value: 0,
      sold_count: 0,
      sold_value: 0,
      net: 0,
      last_at: s.timestamp,
    };
    row.sold_count += 1;
    row.sold_value += price;
    row.net += price;
    if (s.timestamp > row.last_at) row.last_at = s.timestamp;
    map.set(other, row);
  }

  const rows = [...map.values()]
    .sort((a, b) => b.bought_count + b.sold_count - (a.bought_count + a.sold_count))
    .slice(0, 25);

  return (
    <div className="mt-6 mb-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
        Trading partners
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        On-chain sales only — a stronger signal than raw transfers (which include gifts and
        airdrops). Negative net = they&apos;ve sold you more than you&apos;ve sold them.
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 w-12 text-right">#</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Wallet</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Bought from them</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Sold to them</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Net</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Last</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.address}
                className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  <a
                    href={objktProfileLink(r.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={r.address}
                  >
                    {shortAddress(r.address)}
                  </a>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {r.bought_count > 0 ? (
                    <>
                      {r.bought_count}{" "}
                      <span className="text-xs text-zinc-500">{formatTez(r.bought_value)}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {r.sold_count > 0 ? (
                    <>
                      {r.sold_count}{" "}
                      <span className="text-xs text-zinc-500">{formatTez(r.sold_value)}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                    r.net > 0
                      ? "text-green-700 dark:text-green-400"
                      : r.net < 0
                        ? "text-red-700 dark:text-red-400"
                        : "text-zinc-500"
                  }`}
                >
                  {r.net > 0 ? "+" : ""}
                  {formatTez(r.net)}
                </td>
                <td className="px-3 py-2 text-right text-xs text-zinc-500 whitespace-nowrap">
                  {r.last_at.slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-right">
                  <WatchButton address={r.address} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CounterpartyRow {
  address: string;
  alias: string | null;
  sentCount: number;
  receivedCount: number;
  total: number;
  lastSeen: string;
}

async function Counterparties({ address }: { address: string }) {
  const [outgoing, incoming] = await Promise.all([
    getAccountTokenTransfers({ account: address, direction: "from", limit: 1000 }).catch(
      () => [] as TzktTransfer[],
    ),
    getAccountTokenTransfers({ account: address, direction: "to", limit: 1000 }).catch(
      () => [] as TzktTransfer[],
    ),
  ]);

  if (outgoing.length === 0 && incoming.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No token transfers found.</p>;
  }

  const map = new Map<string, CounterpartyRow>();
  for (const t of outgoing) {
    const other = t.to;
    if (!other || other.address === address) continue;
    const row = map.get(other.address) ?? {
      address: other.address,
      alias: other.alias ?? null,
      sentCount: 0,
      receivedCount: 0,
      total: 0,
      lastSeen: t.timestamp,
    };
    row.sentCount += 1;
    row.total += 1;
    if (t.timestamp > row.lastSeen) row.lastSeen = t.timestamp;
    if (other.alias) row.alias = other.alias;
    map.set(other.address, row);
  }
  for (const t of incoming) {
    const other = t.from;
    if (!other || other.address === address) continue;
    const row = map.get(other.address) ?? {
      address: other.address,
      alias: other.alias ?? null,
      sentCount: 0,
      receivedCount: 0,
      total: 0,
      lastSeen: t.timestamp,
    };
    row.receivedCount += 1;
    row.total += 1;
    if (t.timestamp > row.lastSeen) row.lastSeen = t.timestamp;
    if (other.alias) row.alias = other.alias;
    map.set(other.address, row);
  }

  const rows = [...map.values()].sort((a, b) => b.total - a.total).slice(0, 100);
  const truncated = outgoing.length >= 1000 || incoming.length >= 1000;

  return (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
        All transfer counterparties
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        Every wallet that has moved a token to or from this address — includes gifts, airdrops, and
        self-transfers between alts.
      </p>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{map.size}</span>{" "}
        unique counterparties (showing top {rows.length})
        {truncated && (
          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
            (transfer history truncated to 1000 each direction)
          </span>
        )}
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 w-12 text-right">#</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Counterparty</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Sent to them</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Received from</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Total</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.address}
                className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  <a
                    href={objktProfileLink(r.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={r.address}
                  >
                    {r.alias ?? shortAddress(r.address)}
                  </a>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {r.sentCount}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {r.receivedCount}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100 font-medium">
                  {r.total}
                </td>
                <td className="px-3 py-2 text-right">
                  <WatchButton address={r.address} label={r.alias ?? undefined} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
