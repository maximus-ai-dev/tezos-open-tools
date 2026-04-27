import { getActiveEnglishAuctions } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { WatchButton } from "@/components/common/WatchButton";
import { MARKETPLACE_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

function timeRemaining(endTime: string | null): string {
  if (!endTime) return "—";
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export default async function EnglishAuctionsPage() {
  const auctions = await getActiveEnglishAuctions({ limit: 80 }).catch(() => []);
  return (
    <PageShell
      title="English Auctions"
      description="Active English auctions on objkt, ending soonest first."
    >
      {auctions.length === 0 ? (
        <p className="text-sm text-zinc-500">No active English auctions.</p>
      ) : (
        <TokenGrid>
          {auctions.map((a) => {
            if (!a.token) return null;
            const creator = a.token.creators[0]?.holder;
            const currentBid = a.highest_bid_xtz ?? a.highest_bid ?? a.reserve_xtz ?? a.reserve ?? null;
            return (
              <TokenCard
                key={a.id}
                token={{
                  fa: a.token.fa_contract,
                  tokenId: a.token.token_id,
                  name: a.token.name,
                  thumbnailUri: a.token.thumbnail_uri,
                  displayUri: a.token.display_uri,
                  artistAddress: creator?.address ?? null,
                  artistAlias: creator?.alias ?? null,
                }}
                priceMutez={currentBid}
                marketplaceLabel={
                  a.marketplace_contract
                    ? MARKETPLACE_NAMES[a.marketplace_contract] ?? "marketplace"
                    : null
                }
                badge={`⏱ ${timeRemaining(a.end_time)}`}
                footer={
                  a.seller_address ? (
                    <WatchButton
                      address={a.seller_address}
                      label={creator?.alias ?? undefined}
                    />
                  ) : null
                }
              />
            );
          })}
        </TokenGrid>
      )}
    </PageShell>
  );
}
