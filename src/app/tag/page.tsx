import Link from "next/link";
import { searchTags, getTopTags } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function TagSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const tags = query.length > 0 ? await searchTags(query, { limit: 80 }) : await getTopTags({ limit: 30 });

  return (
    <PageShell
      title="Tags"
      description="Browse community-event tags (Proof of Palm, OBJKT4OBJKT, Tezos Tuesday, …). Tags are free-form — artists may spell the same campaign differently. Search broadly, then pick the variants that match."
    >
      <form method="GET" action="/tag" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="palm, proof, objkt4objkt, …"
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Search
        </button>
      </form>

      <h2 className="mt-8 mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {query ? `Tags matching "${query}" (${tags.length})` : "Most-used tags"}
      </h2>

      {tags.length === 0 ? (
        <p className="text-sm text-zinc-500">No tags found.</p>
      ) : (
        <ul className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
          {tags.map((t) => (
            <li
              key={t.name}
              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <Link
                href={`/tag/${encodeURIComponent(t.name)}`}
                className="flex-1 truncate text-sm font-mono hover:underline"
              >
                {t.name}
              </Link>
              <span className="text-xs text-zinc-500 whitespace-nowrap tabular-nums">
                {t.token_count.toLocaleString()} tokens
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
