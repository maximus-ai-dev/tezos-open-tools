import { getOffersForFas } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { OfferTable } from "@/components/common/OfferTable";
import { CONTRACTS } from "@/lib/constants";
import { formatTez } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FXHASH_GENTKS = [CONTRACTS.FXHASH_GENTK_V1, CONTRACTS.FXHASH_GENTK_V2];

export default async function FxhashOffersPage() {
  const offers = await getOffersForFas(FXHASH_GENTKS, { limit: 100 }).catch(() => []);
  const total = offers.reduce((s, o) => s + (o.price_xtz ?? o.price ?? 0), 0);
  return (
    <PageShell
      title="fxhash Collection Offers"
      description="Highest active offers (per token + collection-wide) on fxhash GENTK contracts."
    >
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Active offers:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{offers.length}</span>
        </span>
        <span>
          Total value:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{formatTez(total)}</span>
        </span>
      </div>
      {offers.length === 0 ? (
        <p className="text-sm text-zinc-500">No active offers.</p>
      ) : (
        <OfferTable offers={offers} mode="received" />
      )}
    </PageShell>
  );
}
