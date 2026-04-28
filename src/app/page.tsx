import Link from "next/link";
import { CATEGORY_LABELS, toolsByCategory, type ToolCategory } from "@/lib/tools";
import { GITHUB_URL } from "@/lib/constants";
import { getRecentCommits } from "@/lib/github";

// Temporary event banner. Auto-hides after `endsAt`. Pre-event copy uses
// `upcomingTitle`; once `startsAt` is reached, swaps to `liveTitle`.
// To swap in a future event: edit fields, push, done. To remove early:
// set endsAt to a past date or delete this constant + the banner block below.
const EVENT_BANNER: {
  upcomingTitle: string;
  liveTitle: string;
  subtitle: string;
  href: string;
  startsAt: string;
  endsAt: string;
} | null = {
  upcomingTitle: "Proof of Palm 2026 — May 23–31 🌴",
  liveTitle: "Proof of Palm 2026 is live 🌴",
  subtitle:
    "Live feed of every token tagged #proofofpalm or #proofofpalm2026 during the event window.",
  // Multi-tag URL: covers both spelling variants the community uses.
  href: "/tag/proofofpalm,proofofpalm2026?preset=2026",
  startsAt: "2026-05-23T00:00:00Z",
  endsAt: "2026-06-01T00:00:00Z",
};

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

const ORDER: ToolCategory[] = ["collector", "artist", "general", "fxhash", "advanced"];

export default async function Home() {
  const groups = toolsByCategory();
  const recentCommits = await getRecentCommits(1);
  const lastShippedAt = recentCommits[0]?.date;
  const readyCount = Object.values(groups)
    .flat()
    .filter((t) => t.status === "ready").length;
  const totalCount = Object.values(groups).flat().length;
  // Server-side date check for the temporary event banner — `Date.now()` is
  // intentional here (server components render once per request).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const showBanner = EVENT_BANNER !== null && now < new Date(EVENT_BANNER.endsAt).getTime();
  const isLive = EVENT_BANNER !== null && now >= new Date(EVENT_BANNER.startsAt).getTime();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <section className="mb-12">
        <h1 className="sr-only">Tezos Open Tools</h1>
        {/* Wide ASCII art on tablet+ — single horizontal line.
            Wrapper handles overflow so the <pre> doesn't generate its own
            scroll context (which Chrome sometimes shows as a stub scrollbar). */}
        <div className="hidden sm:block overflow-hidden">
        <pre
          aria-hidden
          className="font-mono leading-none text-zinc-900 dark:text-zinc-100 whitespace-pre m-0 text-[10px] md:text-xs"
        >{`  $$\\                                                                                                   $$\\                         $$\\
  $$ |                                                                                                  $$ |                        $$ |
$$$$$$\\    $$$$$$\\  $$$$$$$$\\  $$$$$$\\   $$$$$$$\\        $$$$$$\\   $$$$$$\\   $$$$$$\\  $$$$$$$\\        $$$$$$\\    $$$$$$\\   $$$$$$\\  $$ | $$$$$$$\\
\\_$$  _|  $$  __$$\\ \\____$$  |$$  __$$\\ $$  _____|      $$  __$$\\ $$  __$$\\ $$  __$$\\ $$  __$$\\       \\_$$  _|  $$  __$$\\ $$  __$$\\ $$ |$$  _____|
  $$ |    $$$$$$$$ |  $$$$ _/ $$ /  $$ |\\$$$$$$\\        $$ /  $$ |$$ /  $$ |$$$$$$$$ |$$ |  $$ |        $$ |    $$ /  $$ |$$ /  $$ |$$ |\\$$$$$$\\
  $$ |$$\\ $$   ____| $$  _/   $$ |  $$ | \\____$$\\       $$ |  $$ |$$ |  $$ |$$   ____|$$ |  $$ |        $$ |$$\\ $$ |  $$ |$$ |  $$ |$$ | \\____$$\\
  \\$$$$  |\\$$$$$$$\\ $$$$$$$$\\ \\$$$$$$  |$$$$$$$  |      \\$$$$$$  |$$$$$$$  |\\$$$$$$$\\ $$ |  $$ |        \\$$$$  |\\$$$$$$  |\\$$$$$$  |$$ |$$$$$$$  |
   \\____/  \\_______|\\________| \\______/ \\_______/        \\______/ $$  ____/  \\_______|\\__|  \\__|         \\____/  \\______/  \\______/ \\__|\\_______/
                                                                  $$ |
                                                                  $$ |
                                                                  \\__|`}</pre>
        </div>
        {/* Stacked ASCII art on mobile — three words wrapped. */}
        <div className="sm:hidden overflow-hidden">
        <pre
          aria-hidden
          className="font-mono leading-none text-zinc-900 dark:text-zinc-100 whitespace-pre m-0 text-[8px]"
        >{`  $$\\
  $$ |
$$$$$$\\    $$$$$$\\  $$$$$$$$\\  $$$$$$\\   $$$$$$$\\
\\_$$  _|  $$  __$$\\ \\____$$  |$$  __$$\\ $$  _____|
  $$ |    $$$$$$$$ |  $$$$ _/ $$ /  $$ |\\$$$$$$\\
  $$ |$$\\ $$   ____| $$  _/   $$ |  $$ | \\____$$\\
  \\$$$$  |\\$$$$$$$\\ $$$$$$$$\\ \\$$$$$$  |$$$$$$$  |
   \\____/  \\_______|\\________| \\______/ \\_______/



 $$$$$$\\   $$$$$$\\   $$$$$$\\  $$$$$$$\\
$$  __$$\\ $$  __$$\\ $$  __$$\\ $$  __$$\\
$$ /  $$ |$$ /  $$ |$$$$$$$$ |$$ |  $$ |
$$ |  $$ |$$ |  $$ |$$   ____|$$ |  $$ |
\\$$$$$$  |$$$$$$$  |\\$$$$$$$\\ $$ |  $$ |
 \\______/ $$  ____/  \\_______|\\__|  \\__|
          $$ |
          $$ |
          \\__|

  $$\\                         $$\\
  $$ |                        $$ |
$$$$$$\\    $$$$$$\\   $$$$$$\\  $$ | $$$$$$$\\
\\_$$  _|  $$  __$$\\ $$  __$$\\ $$ |$$  _____|
  $$ |    $$ /  $$ |$$ /  $$ |$$ |\\$$$$$$\\
  $$ |$$\\ $$ |  $$ |$$ |  $$ |$$ | \\____$$\\
  \\$$$$  |\\$$$$$$  |\\$$$$$$  |$$ |$$$$$$$  |
   \\____/  \\______/  \\______/ \\__|\\_______/`}</pre>
        </div>
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
            href="/why"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
          >
            Why this exists
          </a>
          <span aria-hidden>·</span>
          <a
            href="/faq"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
          >
            FAQ
          </a>
          <span aria-hidden>·</span>
          <a
            href="/donate"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
          >
            Tip jar
          </a>
          {lastShippedAt && (
            <>
              <span aria-hidden>·</span>
              <a
                href="/changelog"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-2 hover:underline"
                title={`Last commit: ${new Date(lastShippedAt).toLocaleString()}`}
              >
                Last updated {relativeTime(lastShippedAt)}
              </a>
            </>
          )}
          <span aria-hidden>·</span>
          <a
            href="/testers"
            className="text-amber-700 dark:text-amber-400 hover:underline underline-offset-2 font-medium"
          >
            Testers — start here →
          </a>
        </p>
      </section>

      {showBanner && EVENT_BANNER && (
        <Link
          href={EVENT_BANNER.href}
          className="block mb-12 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950 dark:to-amber-950 px-5 py-4 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {isLive ? EVENT_BANNER.liveTitle : EVENT_BANNER.upcomingTitle}
              </div>
              <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                {EVENT_BANNER.subtitle}
              </div>
            </div>
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200 whitespace-nowrap">
              {isLive ? "Open feed →" : "Preview feed →"}
            </span>
          </div>
        </Link>
      )}

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
