import { getHoldings } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { PinButton } from "@/components/common/PinButton";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ResalePage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Your Collection"
      description="Tokens held in this wallet, with current floor on objkt."
    >
      <WalletInputForm action="/resale" initial={address ?? ""} />

      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Not a valid Tezos address.
        </p>
      )}

      {valid && <Holdings address={address!} />}
    </PageShell>
  );
}

async function Holdings({ address }: { address: string }) {
  const result = await getHoldings(address, { limit: 120 }).catch(() => null);
  if (!result || result.held.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">No tokens found for this wallet.</p>
    );
  }
  const totalListed = result.held.filter((h) => h.token.listings_active.length > 0).length;
  const floorSum = result.held.reduce(
    (sum, h) => sum + (h.token.listings_active[0]?.price ?? 0),
    0,
  );

  return (
    <>
      <div className="mt-6 mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Held: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{result.held.length}</span>
        </span>
        <span>
          With active listing:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{totalListed}</span>
        </span>
        <span>
          Sum of floors:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">
            {(floorSum / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 0 })} ꜩ
          </span>
        </span>
      </div>
      <TokenGrid>
        {result.held.map((h) => {
          const listing = h.token.listings_active[0];
          const creator = h.token.creators[0]?.holder;
          return (
            <TokenCard
              key={`${h.token.fa_contract}:${h.token.token_id}`}
              token={{
                fa: h.token.fa_contract,
                tokenId: h.token.token_id,
                name: h.token.name,
                thumbnailUri: h.token.thumbnail_uri,
                displayUri: h.token.display_uri,
                artistAddress: creator?.address ?? null,
                artistAlias: creator?.alias ?? null,
                supply: h.token.supply,
              }}
              priceMutez={listing?.price ?? null}
              marketplaceLabel={
                listing ? MARKETPLACE_NAMES[listing.marketplace_contract] ?? "marketplace" : null
              }
              badge={h.quantity > 1 ? `×${h.quantity}` : null}
              footer={
                <PinButton fa={h.token.fa_contract} tokenId={h.token.token_id} />
              }
            />
          );
        })}
      </TokenGrid>
    </>
  );
}
