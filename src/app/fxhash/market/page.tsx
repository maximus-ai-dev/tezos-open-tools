import { getFxhashRecentSales } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { CONTRACTS, MARKETPLACE_NAMES, objktProfileLink } from "@/lib/constants";
import { formatTez, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FXHASH_FAS = [CONTRACTS.FXHASH_GENTK_V1, CONTRACTS.FXHASH_GENTK_V2];

interface AddressVolume {
  address: string;
  volume: number;
  count: number;
}

export default async function FxhashMarketPage() {
  const sales = await getFxhashRecentSales(FXHASH_FAS, { hours: 24, limit: 500 }).catch(() => []);

  const totalVolume = sales.reduce((s, x) => s + (x.price_xtz ?? x.price ?? 0), 0);
  const byBuyer = new Map<string, AddressVolume>();
  const bySeller = new Map<string, AddressVolume>();
  const byMarketplace = new Map<string, AddressVolume>();

  for (const s of sales) {
    const value = s.price_xtz ?? s.price ?? 0;
    if (s.buyer_address) bump(byBuyer, s.buyer_address, value);
    if (s.seller_address) bump(bySeller, s.seller_address, value);
    if (s.marketplace_contract) bump(byMarketplace, s.marketplace_contract, value);
  }

  const topBuyers = topN(byBuyer, 10);
  const topSellers = topN(bySeller, 10);
  const byMarket = topN(byMarketplace, 10);
  const biggestSale = sales.reduce<typeof sales[number] | null>(
    (best, s) => (best === null || (s.price_xtz ?? 0) > (best.price_xtz ?? 0) ? s : best),
    null,
  );

  return (
    <PageShell
      title="fxhash Market Stats"
      description="Aggregated market activity over the fxhash GENTK contracts in the last 24 hours."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Sales (24h)" value={sales.length.toString()} />
        <Stat label="Volume (24h)" value={formatTez(totalVolume)} />
        <Stat
          label="Avg sale"
          value={sales.length > 0 ? formatTez(totalVolume / sales.length) : "—"}
        />
        <Stat
          label="Top sale (24h)"
          value={biggestSale ? formatTez(biggestSale.price_xtz ?? biggestSale.price) : "—"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <RankTable title="Top buyers" rows={topBuyers} />
        <RankTable title="Top sellers" rows={topSellers} />
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
        By marketplace
      </h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 mb-8">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Volume</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {byMarket.map((m) => (
              <tr
                key={m.address}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-3 py-2">
                  {MARKETPLACE_NAMES[m.address] ?? shortAddress(m.address)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {formatTez(m.volume)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{m.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function bump(map: Map<string, AddressVolume>, address: string, value: number) {
  const cur = map.get(address);
  if (cur) {
    cur.volume += value;
    cur.count += 1;
  } else {
    map.set(address, { address, volume: value, count: 1 });
  }
}

function topN(map: Map<string, AddressVolume>, n: number): AddressVolume[] {
  return [...map.values()].sort((a, b) => b.volume - a.volume).slice(0, n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function RankTable({ title, rows }: { title: string; rows: AddressVolume[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <h3 className="px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-zinc-500">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.address}
                className={i > 0 ? "border-t border-zinc-200 dark:border-zinc-800" : ""}
              >
                <td className="px-3 py-1.5 text-right text-zinc-500 tabular-nums w-8">{i + 1}</td>
                <td className="px-3 py-1.5 font-mono text-xs">
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
                <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                  {formatTez(r.volume)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
