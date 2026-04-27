import { getContractEvents } from "@/lib/tzkt";
import { PageShell } from "@/components/common/PageShell";
import { formatDate, parseContractInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ contract?: string; tag?: string }>;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const contract = params.contract ? parseContractInput(params.contract) : null;

  return (
    <PageShell
      title="Contract Events"
      description="On-chain events emitted by a contract — useful for inspecting drops, claim phases, and indexing hooks."
    >
      <form method="GET" action="/event" className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          name="contract"
          defaultValue={params.contract ?? ""}
          placeholder="KT1... contract address"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
        />
        <input
          type="text"
          name="tag"
          defaultValue={params.tag ?? ""}
          placeholder="tag (optional)"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Look up
        </button>
      </form>

      {params.contract && !contract && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid KT1 contract.</p>
      )}

      {contract && <Events contract={contract} tag={params.tag} />}
    </PageShell>
  );
}

async function Events({ contract, tag }: { contract: string; tag?: string }) {
  const events = await getContractEvents(contract, { limit: 50, tag }).catch(() => []);
  if (events.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">No events found for this contract.</p>
    );
  }
  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Showing latest{" "}
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{events.length}</span> events.
      </p>
      <div className="space-y-2">
        {events.map((e) => (
          <details
            key={e.id}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 text-sm"
          >
            <summary className="cursor-pointer flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-xs text-zinc-500">#{e.id}</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{e.tag}</span>
              <span className="text-xs text-zinc-500">
                level {e.level} · {formatDate(e.timestamp)}
              </span>
            </summary>
            <pre className="mt-2 text-xs overflow-x-auto rounded bg-zinc-50 dark:bg-zinc-900 p-2">
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </>
  );
}
