import { getRecentCommits } from "@/lib/github";
import { PageShell } from "@/components/common/PageShell";
import { GITHUB_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function ChangelogPage() {
  const commits = await getRecentCommits(100);

  return (
    <PageShell
      title="Changelog"
      description="Every push to main, freshest first. Pulled live from GitHub."
    >
      <p className="mb-6 text-xs text-zinc-500">
        Want to see diffs? Click any commit to open it on{" "}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          GitHub
        </a>
        .
      </p>

      {commits.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Couldn&apos;t fetch commits — GitHub may be rate-limiting this IP.
        </p>
      ) : (
        <ul className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
          {commits.map((c) => (
            <li
              key={c.sha}
              className="px-3 py-2 flex items-center justify-between gap-3 text-sm"
            >
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-zinc-900 dark:text-zinc-100 hover:underline min-w-0"
                title={c.subject}
              >
                {c.subject}
              </a>
              <span className="text-xs text-zinc-500 shrink-0 font-mono">
                {relativeTime(c.date)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Showing the last {commits.length} commits. For older history, see the full{" "}
        <a
          href={`${GITHUB_URL}/commits`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          GitHub log
        </a>
        .
      </p>
    </PageShell>
  );
}
