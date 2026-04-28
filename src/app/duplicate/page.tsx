import { getHoldings } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function DuplicatePage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Duplicate Editions"
      description="Tokens you hold more than one of — useful for resale planning."
    >
      <WalletInputForm action="/duplicate" initial={address ?? ""} />

      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}

      {valid && <Duplicates address={address!} />}
    </PageShell>
  );
}

async function Duplicates({ address }: { address: string }) {
  const result = await getHoldings(address, { limit: 500, minQty: 1 }).catch(() => null);
  if (!result) return <p className="mt-6 text-sm text-zinc-500">No data.</p>;
  const dupes = result.held.filter((h) => h.quantity > 1);
  if (dupes.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No tokens held with quantity {">"} 1.
      </p>
    );
  }
  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{dupes.length}</span>{" "}
        tokens held in multiple editions.
      </p>
      <TokenGrid>
        {dupes.map((h) => {
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
              badge={`×${h.quantity}`}
            />
          );
        })}
      </TokenGrid>
    </>
  );
}
