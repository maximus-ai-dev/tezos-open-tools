import { getLatestMints } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { MARKETPLACE_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const tokens = await getLatestMints({ limit: 60 }).catch(() => []);
  return (
    <PageShell
      title="Latest Mints"
      description="The newest tokens minted across Tezos NFT collections."
    >
      {tokens.length === 0 ? (
        <p className="text-sm text-zinc-500">No data.</p>
      ) : (
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
                priceMutez={listing?.price ?? null}
                marketplaceLabel={
                  listing ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? "marketplace" : null
                }
                badge={t.supply !== null ? `ed ${t.supply}` : null}
              />
            );
          })}
        </TokenGrid>
      )}
    </PageShell>
  );
}
