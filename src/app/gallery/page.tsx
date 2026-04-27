import { getCreations } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { WatchButton } from "@/components/common/WatchButton";
import { PinButton } from "@/components/common/PinButton";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell title="Gallery" description="All tokens minted by this artist, newest first.">
      <WalletInputForm
        action="/gallery"
        initial={address ?? ""}
        placeholder="tz1... artist wallet address"
      />

      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}

      {valid && <Creations address={address!} />}
    </PageShell>
  );
}

async function Creations({ address }: { address: string }) {
  const tokens = await getCreations(address, { limit: 120 }).catch(() => []);
  if (tokens.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No creations found for this address.</p>;
  }
  return (
    <>
      <div className="mt-6 mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Showing latest{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{tokens.length}</span>{" "}
          creations.
        </p>
        <WatchButton address={address} variant="full" />
      </div>
      <TokenGrid>
        {tokens.map((t) => {
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
              footer={<PinButton fa={t.fa_contract} tokenId={t.token_id} />}
            />
          );
        })}
      </TokenGrid>
    </>
  );
}
