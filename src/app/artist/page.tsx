import { getCreations, getArtistSales } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { MARKETPLACE_NAMES, objktProfileLink, objktTokenLink } from "@/lib/constants";
import { formatDate, formatTez, ipfsToHttp, isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ArtistPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);
  return (
    <PageShell
      title="Artist Summary"
      description="Mints, listings, and recent sales for an artist."
    >
      <WalletInputForm
        action="/artist"
        initial={address ?? ""}
        placeholder="tz1... artist wallet address"
      />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <ArtistSummary address={address!} />}
    </PageShell>
  );
}

async function ArtistSummary({ address }: { address: string }) {
  const [creations, sales90d, sales30d] = await Promise.all([
    getCreations(address, { limit: 1000 }).catch(() => []),
    getArtistSales(address, { hours: 24 * 90, limit: 200 }).catch(() => []),
    getArtistSales(address, { hours: 24 * 30, limit: 200 }).catch(() => []),
  ]);

  if (creations.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No creations found for this address.</p>;
  }

  const totalListed = creations.filter((t) => t.listings_active.length > 0).length;
  const minListing = creations
    .flatMap((t) => t.listings_active.map((l) => l.price))
    .reduce<number | null>((min, p) => (min === null || p < min ? p : min), null);

  const volume90d = sales90d.reduce((s, x) => s + (x.price_xtz ?? x.price ?? 0), 0);
  const volume30d = sales30d.reduce((s, x) => s + (x.price_xtz ?? x.price ?? 0), 0);
  const recentSales = sales90d.slice(0, 12);

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Tokens minted" value={String(creations.length)} hint="(latest 1000)" />
          <Stat label="With active listing" value={String(totalListed)} />
          <Stat label="Floor (active)" value={minListing !== null ? formatTez(minListing) : "—"} />
          <Stat
            label="Sales (30d / 90d)"
            value={`${sales30d.length} / ${sales90d.length}`}
          />
          <Stat label="Volume 30d" value={formatTez(volume30d)} />
          <Stat label="Volume 90d" value={formatTez(volume90d)} />
          <Stat
            label="Top sale (90d)"
            value={
              sales90d.length > 0
                ? formatTez(Math.max(...sales90d.map((s) => s.price_xtz ?? s.price ?? 0)))
                : "—"
            }
          />
          <Stat
            label="Avg sale (90d)"
            value={
              sales90d.length > 0
                ? formatTez(volume90d / sales90d.length)
                : "—"
            }
          />
        </div>
      </section>

      {recentSales.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Recent sales
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">When</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Buyer</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => {
                  const tok = s.token;
                  const thumb = tok ? ipfsToHttp(tok.thumbnail_uri) ?? ipfsToHttp(tok.display_uri) : null;
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-zinc-500">{formatDate(s.timestamp)}</td>
                      <td className="px-3 py-2">
                        {tok ? (
                          <a
                            href={objktTokenLink(tok.fa_contract, tok.token_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:underline"
                          >
                            <span className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                              {thumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                              )}
                            </span>
                            <span className="truncate max-w-xs">{tok.name ?? `#${tok.token_id}`}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {s.buyer_address ? (
                          <a
                            href={objktProfileLink(s.buyer_address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            title={s.buyer_address}
                          >
                            {shortAddress(s.buyer_address)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {MARKETPLACE_NAMES[s.marketplace_contract] ?? "marketplace"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {formatTez(s.price_xtz ?? s.price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Latest creations
        </h2>
        <div className="mb-3 flex gap-3 text-sm">
          <a className="text-zinc-600 dark:text-zinc-400 hover:underline" href={`/gallery?address=${address}`}>
            Full gallery →
          </a>
          <a className="text-zinc-600 dark:text-zinc-400 hover:underline" href={`/fans?address=${address}`}>
            Top collectors →
          </a>
          <a className="text-zinc-600 dark:text-zinc-400 hover:underline" href={`/burned?address=${address}`}>
            Burned →
          </a>
          <a
            className="text-zinc-600 dark:text-zinc-400 hover:underline"
            href={objktProfileLink(address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Profile on objkt →
          </a>
        </div>
        <TokenGrid>
          {creations.slice(0, 12).map((t) => {
            const listing = t.listings_active[0];
            return (
              <TokenCard
                key={`${t.fa_contract}:${t.token_id}`}
                token={{
                  fa: t.fa_contract,
                  tokenId: t.token_id,
                  name: t.name,
                  thumbnailUri: t.thumbnail_uri,
                  displayUri: t.display_uri,
                  artistAddress: address,
                  supply: t.supply,
                }}
                priceMutez={listing?.price ?? null}
                marketplaceLabel={
                  listing ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? "marketplace" : null
                }
                badge={t.supply !== null ? `ed ${t.supply}` : null}
              />
            );
          })}
        </TokenGrid>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
        {hint && <span className="ml-1 normal-case text-zinc-400 text-[10px]">{hint}</span>}
      </div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
