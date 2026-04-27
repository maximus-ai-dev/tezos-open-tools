import { getFaHolders, getFaInfo } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { objktProfileLink } from "@/lib/constants";
import { parseContractInput, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ fa?: string }>;
}

export default async function FxhashHoldersPage({ searchParams }: PageProps) {
  const { fa: faParam } = await searchParams;
  const fa = faParam ? parseContractInput(faParam) : null;
  return (
    <PageShell
      title="Holders"
      description="Top holders of any FA2 collection."
    >
      <WalletInputForm
        action="/fxhash/holders"
        initial={faParam ?? ""}
        paramName="fa"
        placeholder="KT1... contract address or objkt.com collection URL"
      />
      {faParam && !fa && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t find a contract address in that input.
        </p>
      )}
      {fa && <Holders fa={fa} />}
    </PageShell>
  );
}

interface HolderRow {
  address: string;
  alias: string | null;
  totalEditions: number;
  uniqueTokens: number;
}

async function Holders({ fa }: { fa: string }) {
  const [info, holdersResult] = await Promise.all([
    getFaInfo(fa).catch(() => null),
    getFaHolders(fa, { limit: 1000 }).then(
      (rows) => ({ ok: true as const, rows }),
      (err: unknown) => ({ ok: false as const, err }),
    ),
  ]);

  if (!holdersResult.ok) {
    return (
      <div className="mt-6 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-4 text-sm">
        <p className="text-amber-900 dark:text-amber-200">
          <strong>{info?.name ?? "This collection"}</strong>
          {info?.items !== undefined && info.items !== null && (
            <> has {info.items.toLocaleString()} items, which</>
          )}{" "}
          is too large for objkt&apos;s GraphQL to aggregate in one shot.
        </p>
        <p className="mt-2 text-amber-800 dark:text-amber-300">
          Try{" "}
          <a className="underline" href={`/fans?address=${info?.creator_address ?? ""}`}>
            /fans
          </a>{" "}
          if you want holders of a specific artist&apos;s work, or browse the collection on{" "}
          <a
            className="underline"
            href={`https://objkt.com/collections/${fa}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            objkt
          </a>
          .
        </p>
      </div>
    );
  }

  const rows = holdersResult.rows;
  if (rows.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No holders found for this contract.</p>;
  }
  const grouped = new Map<string, HolderRow>();
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
  const holders = [...grouped.values()].sort((a, b) => {
    if (b.uniqueTokens !== a.uniqueTokens) return b.uniqueTokens - a.uniqueTokens;
    return b.totalEditions - a.totalEditions;
  });
  const truncated = rows.length === 5000;

  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        {info?.name && (
          <>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{info.name}</span> —{" "}
          </>
        )}
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{holders.length}</span>{" "}
        unique holders
        {truncated && (
          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
            (sample limited to 5000 — totals may understate)
          </span>
        )}
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 w-12 text-right">#</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Holder</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Unique tokens</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Total editions</th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h, i) => (
              <tr
                key={h.address}
                className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  <a
                    href={objktProfileLink(h.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={h.address}
                  >
                    {h.alias ?? shortAddress(h.address)}
                  </a>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100 font-medium">
                  {h.uniqueTokens}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {h.totalEditions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
