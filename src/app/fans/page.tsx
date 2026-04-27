import { getArtistTokenHolders } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { objktProfileLink } from "@/lib/constants";
import { isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function FansPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Fans / Collectors"
      description="People who hold the most tokens by this artist."
    >
      <WalletInputForm
        action="/fans"
        initial={address ?? ""}
        placeholder="tz1... artist wallet address"
      />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <FansList address={address!} />}
    </PageShell>
  );
}

interface CollectorRow {
  address: string;
  alias: string | null;
  totalEditions: number;
  uniqueTokens: number;
}

async function FansList({ address }: { address: string }) {
  const rows = await getArtistTokenHolders(address, { limit: 5000 }).catch(() => []);
  if (rows.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No collectors found.</p>;
  }
  const grouped = new Map<string, CollectorRow>();
  for (const r of rows) {
    const existing = grouped.get(r.holder_address);
    if (existing) {
      existing.totalEditions += Number(r.quantity);
      existing.uniqueTokens += 1;
    } else {
      grouped.set(r.holder_address, {
        address: r.holder_address,
        alias: r.holder?.alias ?? null,
        totalEditions: Number(r.quantity),
        uniqueTokens: 1,
      });
    }
  }
  const collectors = [...grouped.values()].sort((a, b) => {
    if (b.uniqueTokens !== a.uniqueTokens) return b.uniqueTokens - a.uniqueTokens;
    return b.totalEditions - a.totalEditions;
  });
  const truncated = rows.length === 5000;

  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{collectors.length}</span>{" "}
        unique collectors{" "}
        {truncated && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            (sample limited to 5000 holdings — totals may understate for very prolific artists)
          </span>
        )}
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 w-12 text-right">#</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Collector</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Unique tokens</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Total editions</th>
            </tr>
          </thead>
          <tbody>
            {collectors.map((c, i) => (
              <tr
                key={c.address}
                className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  <a
                    href={objktProfileLink(c.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={c.address}
                  >
                    {c.alias ?? shortAddress(c.address)}
                  </a>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100 font-medium">
                  {c.uniqueTokens}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {c.totalEditions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
