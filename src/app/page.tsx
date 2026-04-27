import Link from "next/link";
import { CATEGORY_LABELS, toolsByCategory, type ToolCategory } from "@/lib/tools";
import { GITHUB_URL } from "@/lib/constants";

const ORDER: ToolCategory[] = ["collector", "fxhash", "artist", "general", "advanced"];

export default function Home() {
  const groups = toolsByCategory();
  const readyCount = Object.values(groups)
    .flat()
    .filter((t) => t.status === "ready").length;
  const totalCount = Object.values(groups).flat().length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <section className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Tezos NFT Toolkit</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400 max-w-2xl">
          An <strong className="text-zinc-900 dark:text-zinc-100">open-source</strong> suite of tools
          for Tezos NFT collectors and artists. Free forever, MIT licensed, no logins, no rate limits,
          no arbitrary bans.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>
            {readyCount}/{totalCount} tools ready
          </span>
          <span aria-hidden>·</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
          >
            Source on GitHub
          </a>
          <span aria-hidden>·</span>
          <a
            href={`https://vercel.com/new/clone?repository-url=${encodeURIComponent(GITHUB_URL)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
          >
            Self-host on Vercel
          </a>
          <span aria-hidden>·</span>
          <a
            href="/testers"
            className="text-amber-700 dark:text-amber-400 hover:underline underline-offset-2 font-medium"
          >
            Testers — start here →
          </a>
        </p>
      </section>

      {ORDER.map((cat) => (
        <section key={cat} className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups[cat].map((tool) => {
              const interactive = tool.status === "ready" || tool.status === "stub";
              const cardClass =
                tool.status === "ready"
                  ? "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  : tool.status === "stub"
                    ? "border-amber-200 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    : "border-dashed border-zinc-200 dark:border-zinc-800 opacity-60";
              const Wrapper = interactive ? Link : "div";
              const wrapperProps = interactive ? { href: tool.href } : {};
              return (
                <Wrapper
                  key={tool.slug}
                  {...(wrapperProps as { href: string })}
                  className={`block rounded-lg border p-4 transition-colors ${cardClass}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{tool.name}</h3>
                    {tool.status === "stub" && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-semibold">
                        stub
                      </span>
                    )}
                    {tool.status === "planned" && (
                      <span className="text-[10px] uppercase tracking-wide text-zinc-400">soon</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
                  {tool.status === "stub" && tool.stubReason && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      {tool.stubReason}
                    </p>
                  )}
                </Wrapper>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
