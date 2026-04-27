import { getArtistListings } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { formatTez, isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Cross-marketplace Floor Compare"
      description="For an artist wallet, see how their active listings break down across marketplaces. Useful for collectors deciding where to buy and artists deciding where to list."
    >
      <WalletInputForm
        action="/compare"
        initial={address ?? ""}
        placeholder="tz1... artist wallet address"
      />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <Compare address={address!} />}
    </PageShell>
  );
}

interface Bucket {
  marketplace: string;
  count: number;
  cheapest: number;
  median: number;
  total: number;
}

async function Compare({ address }: { address: string }) {
  const listings = await getArtistListings(address, { limit: 1000 }).catch(() => []);

  if (listings.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No active listings on tokens created by this address.
      </p>
    );
  }

  const byMarketplace = new Map<string, number[]>();
  for (const l of listings) {
    const arr = byMarketplace.get(l.marketplace_contract) ?? [];
    arr.push(l.price);
    byMarketplace.set(l.marketplace_contract, arr);
  }

  const buckets: Bucket[] = [];
  for (const [marketplace, prices] of byMarketplace) {
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const total = sorted.reduce((s, x) => s + x, 0);
    buckets.push({
      marketplace,
      count: sorted.length,
      cheapest: sorted[0],
      median,
      total,
    });
  }
  buckets.sort((a, b) => b.count - a.count);

  const totalListings = listings.length;
  const totalValue = listings.reduce((s, l) => s + l.price, 0);
  const overallCheapest = listings[0]; // already sorted price asc

  return (
    <>
      <div className="mt-6 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total active listings" value={String(totalListings)} />
        <Stat label="Marketplaces in use" value={String(buckets.length)} />
        <Stat label="Sum if all sold" value={formatTez(totalValue)} />
        <Stat
          label="Cheapest overall"
          value={formatTez(overallCheapest.price)}
          hint={MARKETPLACE_NAMES[overallCheapest.marketplace_contract] ?? "marketplace"}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Listings</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Cheapest</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Median</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Total value</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">% of listings</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => {
              const pct = (b.count / totalListings) * 100;
              return (
                <tr
                  key={b.marketplace}
                  className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {MARKETPLACE_NAMES[b.marketplace] ?? shortAddress(b.marketplace)}
                    </div>
                    <div className="text-xs font-mono text-zinc-500" title={b.marketplace}>
                      {shortAddress(b.marketplace)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{b.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTez(b.cheapest)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatTez(b.median)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                    {formatTez(b.total)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-zinc-500 w-12">{pct.toFixed(1)}%</span>
                      <span
                        className="inline-block h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"
                        style={{ width: `${Math.max(8, pct)}px` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        &ldquo;Cheapest&rdquo; is the lowest active listing price. Multi-edition listings count as
        one listing each (one row in the marketplace&apos;s ledger).
      </p>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );
}
