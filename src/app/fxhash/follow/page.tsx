import { getRecentSalesForFas } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { LiveSalesFeed } from "@/components/common/LiveSalesFeed";
import { CONTRACTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FXHASH_GENTKS = [CONTRACTS.FXHASH_GENTK_V1, CONTRACTS.FXHASH_GENTK_V2];
const ENDPOINT = `/api/live/sales-fa?fas=${FXHASH_GENTKS.join(",")}&minutes=720&limit=120`;

export default async function FxhashSecondaryPage() {
  const initial = await getRecentSalesForFas(FXHASH_GENTKS, { hours: 12, limit: 60 }).catch(() => []);
  return (
    <PageShell
      title="fxhash Secondary Market"
      description="Live feed of secondary sales of fxhash GENTK iterations across all marketplaces."
    >
      <LiveSalesFeed initial={initial} endpoint={ENDPOINT} pollMs={4000} />
    </PageShell>
  );
}
