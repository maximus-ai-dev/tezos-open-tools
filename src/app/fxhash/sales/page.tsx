import { getRecentSales } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { LiveSalesFeed } from "@/components/common/LiveSalesFeed";
import { FXHASH_MARKETPLACE_CONTRACTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FxhashSalesPage() {
  const allRecent = await getRecentSales({ hours: 6, limit: 200 }).catch(() => []);
  const initial = allRecent
    .filter((s) => FXHASH_MARKETPLACE_CONTRACTS.has(s.marketplace_contract))
    .slice(0, 60);
  return (
    <PageShell
      title="fxhash Sales"
      description="Live sales feed for the fxhash marketplaces."
    >
      <LiveSalesFeed initial={initial} endpoint="/api/live/sales?fxhash=1&minutes=360&limit=200" />
    </PageShell>
  );
}
