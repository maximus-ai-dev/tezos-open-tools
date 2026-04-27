import { getRecentSales } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { LiveSalesFeed } from "@/components/common/LiveSalesFeed";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const initial = await getRecentSales({ hours: 1, limit: 60 }).catch(() => []);
  return (
    <PageShell
      title="Live Feed"
      description="Real-time sales across Tezos NFT marketplaces. Updates every 4 seconds."
    >
      <LiveSalesFeed initial={initial} endpoint="/api/live/sales?minutes=60&limit=50" />
    </PageShell>
  );
}
