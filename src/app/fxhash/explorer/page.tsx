import { getFaInfo, getVariations, type VariationSort } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import {
  MARKETPLACE_NAMES,
  objktTokenLink,
  objktProfileLink,
} from "@/lib/constants";
import { formatTez, ipfsToHttp, parseContractInput, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ fa?: string; sort?: string }>;
}

const SORT_OPTIONS: Array<{ key: VariationSort; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "floor_asc", label: "Cheapest active" },
  { key: "highest_offer_desc", label: "Highest standing offer" },
];

export default async function FxhashExplorerPage({ searchParams }: PageProps) {
  const { fa: faParam, sort: sortParam } = await searchParams;
  const fa = faParam ? parseContractInput(faParam) : null;
  const sort: VariationSort =
    SORT_OPTIONS.find((s) => s.key === sortParam)?.key ?? "newest";

  return (
    <PageShell
      title="fxhash Variations"
      description="Browse iterations of any FA2 collection sorted by mint date, floor price, or standing offer. Designed for fxhash but works for any iteration-based collection."
    >
      <WalletInputForm
        action="/fxhash/explorer"
        initial={faParam ?? ""}
        paramName="fa"
        placeholder="KT1... contract address or objkt collection URL"
      />

      {faParam && !fa && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t find a contract address in that input.
        </p>
      )}

      {fa && <Variations fa={fa} sort={sort} />}
    </PageShell>
  );
}

async function Variations({ fa, sort }: { fa: string; sort: VariationSort }) {
  const [info, tokens] = await Promise.all([
    getFaInfo(fa).catch(() => null),
    getVariations(fa, { limit: 60, sort }).catch(() => []),
  ]);

  if (tokens.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No tokens found in this collection.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {info?.name && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{info.name}</span>
          {info.items !== null && <span> · {info.items.toLocaleString()} items</span>}
          {info.floor_price !== null && info.floor_price > 0 && (
            <span> · floor {formatTez(info.floor_price)}</span>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <a
            key={opt.key}
            href={`/fxhash/explorer?fa=${fa}&sort=${opt.key}`}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              opt.key === sort
                ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tokens.map((t) => {
          const thumb = ipfsToHttp(t.thumbnail_uri) ?? ipfsToHttp(t.display_uri);
          const listing = t.listings_active[0];
          const holder = t.holders[0];
          const lastSale = t.listing_sales[0];
          return (
            <article
              key={`${t.fa_contract}:${t.token_id}`}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <a
                href={objktTokenLink(t.fa_contract, t.token_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square bg-zinc-100 dark:bg-zinc-900"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={t.name ?? `#${t.token_id}`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                    no preview
                  </div>
                )}
              </a>
              <div className="p-2 text-xs space-y-1">
                <a
                  href={objktTokenLink(t.fa_contract, t.token_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-medium truncate hover:underline text-zinc-900 dark:text-zinc-100"
                >
                  {t.name ?? `#${t.token_id}`}
                </a>
                {holder && (
                  <a
                    href={objktProfileLink(holder.holder_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 truncate"
                    title={holder.holder_address}
                  >
                    held by {holder.holder?.alias ?? shortAddress(holder.holder_address)}
                  </a>
                )}
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  {listing ? (
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {formatTez(listing.price)}
                      <span className="ml-1 text-zinc-500 font-normal">
                        on {MARKETPLACE_NAMES[listing.marketplace_contract] ?? "mkt"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">no active listing</span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[10px] text-zinc-500">
                  {t.highest_offer !== null && t.highest_offer > 0 && (
                    <span>top offer {formatTez(t.highest_offer)}</span>
                  )}
                  {lastSale && (
                    <span>last {formatTez(lastSale.price_xtz)}</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
