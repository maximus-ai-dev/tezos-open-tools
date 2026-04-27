import { getOffersReceived } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { OfferTable } from "@/components/common/OfferTable";
import { formatTez, isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function OffersReceivedPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Offers Received"
      description="Active offers on tokens you own (and personal offers sent to you)."
    >
      <WalletInputForm action="/offers/received" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <OffersList address={address!} />}
    </PageShell>
  );
}

async function OffersList({ address }: { address: string }) {
  const offers = await getOffersReceived(address, { limit: 200 }).catch(() => []);
  if (offers.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No active offers.</p>;
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
          Sum if all accepted:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{formatTez(total)}</span>
        </span>
      </div>
      <OfferTable offers={offers} mode="received" />
    </>
  );
}
