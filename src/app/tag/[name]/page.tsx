import Link from "next/link";
import { getTokensByTag } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { LiveTagFeed } from "@/components/common/LiveTagFeed";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ since?: string; until?: string; preset?: string }>;
}

interface DatePreset {
  key: string;
  label: string;
  since?: string;
  until?: string;
}

const PRESETS: DatePreset[] = [
  { key: "30d", label: "Last 30d", since: isoDaysAgo(30) },
  { key: "7d", label: "Last 7d", since: isoDaysAgo(7) },
  { key: "2026", label: "2026", since: "2026-01-01T00:00:00Z", until: "2027-01-01T00:00:00Z" },
  { key: "2025", label: "2025", since: "2025-01-01T00:00:00Z", until: "2026-01-01T00:00:00Z" },
  { key: "2024", label: "2024", since: "2024-01-01T00:00:00Z", until: "2025-01-01T00:00:00Z" },
  { key: "all", label: "All time" },
];

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function generateMetadata({ params }: PageProps) {
  const { name } = await params;
  const tag = decodeURIComponent(name);
  return { title: `#${tag} — Tezos tag feed`, description: `Tokens tagged ${tag} on Tezos.` };
}

export default async function TagDetailPage({ params, searchParams }: PageProps) {
  const { name } = await params;
  const { preset, since, until } = await searchParams;
  const tag = decodeURIComponent(name);
  const active = PRESETS.find((p) => p.key === preset) ?? PRESETS[0]!;
  const effectiveSince = since ?? active.since;
  const effectiveUntil = until ?? active.until;

  const tokens = await getTokensByTag(tag, {
    since: effectiveSince,
    until: effectiveUntil,
    limit: 96,
  }).catch(() => []);

  return (
    <PageShell
      title={`#${tag}`}
      description="Tokens tagged with this name. Anyone can use any tag — sort + share, but check creators if it matters."
    >
      <div className="mb-4 flex flex-wrap items-center gap-1 text-xs">
        <span className="text-zinc-500 mr-2">Window:</span>
        {PRESETS.map((p) => {
          const isActive = (preset ?? "30d") === p.key;
          return (
            <Link
              key={p.key}
              href={`/tag/${encodeURIComponent(tag)}?preset=${p.key}`}
              className={`px-2 py-1 rounded border ${
                isActive
                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
        <Link
          href="/tag"
          className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-xs"
        >
          ← all tags
        </Link>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        {tokens.length} token{tokens.length === 1 ? "" : "s"}
        {tokens.length === 96 && " (showing first 96 — increase the time window narrower if you want fewer)"}
      </p>

      <LiveTagFeed
        tag={tag}
        initial={tokens}
        since={effectiveSince}
        until={effectiveUntil}
        livePollEnabled={windowIncludesNow(effectiveUntil)}
      />
    </PageShell>
  );
}

function windowIncludesNow(until: string | undefined): boolean {
  if (!until) return true;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > Date.now();
}
