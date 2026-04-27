import { getFxhashRecentSales, getFaNames } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { CONTRACTS, objktCollectionLink } from "@/lib/constants";
import { formatTez, ipfsToHttp, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FXHASH_FAS = [CONTRACTS.FXHASH_GENTK_V1, CONTRACTS.FXHASH_GENTK_V2];

interface ProjectStat {
  faContract: string;
  volume: number;
  count: number;
  topPrice: number;
  sampleThumbnail: string | null;
  sampleName: string | null;
}

export default async function FxhashTopPage() {
  const sales = await getFxhashRecentSales(FXHASH_FAS, { hours: 24, limit: 500 }).catch(() => []);

  // For fxhash GENTK v1/v2 all sales aggregate to one bucket per contract.
  // For per-project contracts (fxhash v3) sales aggregate per-project automatically.
  const map = new Map<string, ProjectStat>();
  for (const s of sales) {
    if (!s.token) continue;
    const fa = s.token.fa_contract;
    const value = s.price_xtz ?? s.price ?? 0;
    const cur = map.get(fa);
    if (cur) {
      cur.volume += value;
      cur.count += 1;
      if (value > cur.topPrice) cur.topPrice = value;
    } else {
      map.set(fa, {
        faContract: fa,
        volume: value,
        count: 1,
        topPrice: value,
        sampleThumbnail: s.token.thumbnail_uri ?? s.token.display_uri ?? null,
        sampleName: s.token.name,
      });
    }
  }

  const ranked = [...map.values()].sort((a, b) => b.volume - a.volume).slice(0, 30);
  const faNames = await getFaNames(ranked.map((r) => r.faContract)).catch(() => new Map());

  return (
    <PageShell
      title="fxhash Project Stats"
      description="fxhash projects ranked by 24-hour secondary volume on the GENTK contracts."
    >
      {ranked.length === 0 ? (
        <p className="text-sm text-zinc-500">No fxhash sales in the last 24 hours.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
              <tr>
                <th className="px-3 py-2 w-10 text-right font-medium text-zinc-600 dark:text-zinc-400">#</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Project</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Volume</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Sales</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Top sale</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Avg</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => {
                const meta = faNames.get(p.faContract);
                const name = meta?.name ?? p.sampleName ?? shortAddress(p.faContract);
                const logo = ipfsToHttp(meta?.logo ?? p.sampleThumbnail);
                return (
                  <tr
                    key={p.faContract}
                    className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2">
                      <a
                        href={objktCollectionLink(p.faContract)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline"
                      >
                        <span className="w-7 h-7 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                          {logo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logo}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </span>
                        <span className="truncate max-w-xs text-zinc-900 dark:text-zinc-100">
                          {name}
                        </span>
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatTez(p.volume)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatTez(p.topPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                      {formatTez(p.volume / p.count)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
