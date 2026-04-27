import { getRecentSales } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { MARKETPLACE_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const WINDOWS: Array<{ key: string; label: string; hours: number }> = [
  { key: "1h", label: "1 hour", hours: 1 },
  { key: "24h", label: "24 hours", hours: 24 },
  { key: "7d", label: "7 days", hours: 24 * 7 },
];

interface PageProps {
  searchParams: Promise<{ window?: string }>;
}

export default async function TopSalesPage({ searchParams }: PageProps) {
  const { window } = await searchParams;
  const active = WINDOWS.find((w) => w.key === window) ?? WINDOWS[1];
  const sales = await getRecentSales({ hours: active.hours, limit: 60, sortBy: "price" }).catch(() => []);

  return (
    <PageShell
      title="Top Sales"
      description={`Highest-priced sales in the last ${active.label}.`}
    >
      <div className="flex gap-2 mb-6 text-sm">
        {WINDOWS.map((w) => (
          <a
            key={w.key}
            href={`/topsales?window=${w.key}`}
            className={`px-3 py-1.5 rounded-md border ${
              w.key === active.key
                ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            {w.label}
          </a>
        ))}
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-zinc-500">No sales in this window.</p>
      ) : (
        <TokenGrid>
          {sales.map((s) => {
            if (!s.token) return null;
            const creator = s.token.creators[0]?.holder;
            return (
              <TokenCard
                key={s.id}
                token={{
                  fa: s.token.fa_contract,
                  tokenId: s.token.token_id,
                  name: s.token.name,
                  thumbnailUri: s.token.thumbnail_uri,
                  displayUri: s.token.display_uri,
                  artistAddress: creator?.address ?? null,
                  artistAlias: creator?.alias ?? null,
                }}
                priceMutez={s.price_xtz ?? s.price}
                marketplaceLabel={
                  MARKETPLACE_NAMES[s.marketplace_contract] ?? "marketplace"
                }
              />
            );
          })}
        </TokenGrid>
      )}
    </PageShell>
  );
}
