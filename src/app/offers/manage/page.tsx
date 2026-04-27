import { getOffersMade } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { isTezosAddress, formatTez } from "@/lib/utils";
import { OfferTable } from "@/components/common/OfferTable";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function YourOffersPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);
  return (
    <PageShell
      title="Your Offers"
      description="Active offers you have placed on tokens or whole collections."
    >
      <WalletInputForm action="/offers/manage" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <YourOffers address={address!} />}
    </PageShell>
  );
}

async function YourOffers({ address }: { address: string }) {
  const offers = await getOffersMade(address, { limit: 200 }).catch(() => []);
  if (offers.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No active offers from this address.</p>;
  }
  const total = offers.reduce((sum, o) => sum + (o.price_xtz ?? o.price ?? 0), 0);
  return (
    <>
      <div className="mt-6 mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Active offers:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{offers.length}</span>
        </span>
        <span>
          Total committed:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{formatTez(total)}</span>
        </span>
      </div>
      <OfferTable offers={offers} mode="made" />
    </>
  );
}
