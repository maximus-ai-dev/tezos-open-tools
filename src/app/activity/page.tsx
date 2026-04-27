import { getSalesByBuyer, getSalesBySeller } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { ActivityHeatmap } from "@/components/common/ActivityHeatmap";
import { isTezosAddress, formatTez, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Activity Heatmap"
      description="Daily buy + sell calendar for any Tezos wallet — the last 365 days at a glance."
    >
      <WalletInputForm action="/activity" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <Heatmap address={address!} />}
    </PageShell>
  );
}

async function Heatmap({ address }: { address: string }) {
  const [buys, sells] = await Promise.all([
    getSalesByBuyer(address, { limit: 5000 }).catch(() => []),
    getSalesBySeller(address, { limit: 5000 }).catch(() => []),
  ]);

  if (buys.length === 0 && sells.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No on-chain sales for {shortAddress(address)}.
      </p>
    );
  }

  const buyValue = buys.reduce((s, b) => s + (b.price_xtz ?? b.price ?? 0), 0);
  const sellValue = sells.reduce((s, b) => s + (b.price_xtz ?? b.price ?? 0), 0);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Bought" value={String(buys.length)} sub={formatTez(buyValue)} />
        <Stat label="Sold" value={String(sells.length)} sub={formatTez(sellValue)} />
        <Stat
          label="Net spend"
          value={formatTez(buyValue - sellValue)}
          sub={buyValue > sellValue ? "outflow" : "inflow"}
        />
        <Stat label="Total events" value={String(buys.length + sells.length)} />
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <ActivityHeatmap buys={buys} sells={sells} />
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Hover a cell for the day breakdown. Colors are scaled to this wallet&apos;s busiest day.
      </p>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
