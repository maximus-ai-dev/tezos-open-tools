import { getFaInfo, getFaTokens } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { TokenBuyFooter } from "@/components/common/TokenBuyFooter";
import { MARKETPLACE_NAMES, objktCollectionLink, objktProfileLink } from "@/lib/constants";
import { formatTez, ipfsToHttp, parseContractInput, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ fa?: string }>;
}

export default async function FxhashProjectPage({ searchParams }: PageProps) {
  const { fa: faParam } = await searchParams;
  const fa = faParam ? parseContractInput(faParam) : null;
  return (
    <PageShell
      title="fxhash Project"
      description="Project info and iterations for any Tezos FA2 collection contract."
    >
      <WalletInputForm
        action="/fxhash/generative"
        initial={faParam ?? ""}
        paramName="fa"
        placeholder="KT1... contract address or objkt.com collection URL"
      />
      {faParam && !fa && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t find a contract address in that input.
        </p>
      )}
      {fa && <Project fa={fa} />}
    </PageShell>
  );
}

async function Project({ fa }: { fa: string }) {
  const [info, tokens] = await Promise.all([
    getFaInfo(fa).catch(() => null),
    getFaTokens(fa, { limit: 60 }).catch(() => []),
  ]);

  if (!info && tokens.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No data found for this contract.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {info && <ProjectHeader info={info} />}
      <div className="flex gap-3 text-sm">
        <a className="text-zinc-600 dark:text-zinc-400 hover:underline" href={`/fxhash/floor?fa=${fa}`}>
          Floor →
        </a>
        <a className="text-zinc-600 dark:text-zinc-400 hover:underline" href={`/fxhash/holders?fa=${fa}`}>
          Holders →
        </a>
      </div>
      <TokenGrid>
        {tokens.map((t) => {
          const listing = t.listings_active[0];
          const creator = t.creators?.[0]?.holder;
          return (
            <TokenCard
              key={`${t.fa_contract}:${t.token_id}`}
              token={{
                fa: t.fa_contract,
                tokenId: t.token_id,
                name: t.name,
                thumbnailUri: t.thumbnail_uri,
                displayUri: t.display_uri,
                artistAddress: creator?.address ?? null,
                artistAlias: creator?.alias ?? null,
                supply: t.supply,
              }}
              priceMutez={listing?.price ?? t.open_edition_active?.price ?? null}
              marketplaceLabel={
                listing
                  ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? "marketplace"
                  : t.open_edition_active
                    ? "open edition"
                    : null
              }
              footer={<TokenBuyFooter token={t} />}
            />
          );
        })}
      </TokenGrid>
    </div>
  );
}

function ProjectHeader({ info }: { info: NonNullable<Awaited<ReturnType<typeof getFaInfo>>> }) {
  const logo = ipfsToHttp(info.logo);
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 w-24 h-24 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={info.name ?? info.contract} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold truncate">{info.name ?? info.contract}</h2>
            <a
              href={objktCollectionLink(info.contract)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
            >
              View on objkt →
            </a>
          </div>
          {info.description && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {info.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {info.creator && (
              <span>
                Creator:{" "}
                <a
                  href={objktProfileLink(info.creator.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  {info.creator.alias ?? shortAddress(info.creator.address)}
                </a>
              </span>
            )}
            {info.items !== null && (
              <span>
                Items:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {info.items.toLocaleString()}
                </span>
              </span>
            )}
            {info.editions !== null && (
              <span>
                Editions:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {info.editions.toLocaleString()}
                </span>
              </span>
            )}
            {info.floor_price !== null && info.floor_price > 0 && (
              <span>
                Floor:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {formatTez(info.floor_price)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
