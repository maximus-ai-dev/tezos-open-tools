import Link from "next/link";
import { CATEGORY_LABELS, toolsByCategory, type ToolCategory } from "@/lib/tools";
import { ConnectButton } from "@/components/wallet/ConnectButton";

const ORDER: ToolCategory[] = ["collector", "fxhash", "artist", "general", "advanced"];

export function Navbar() {
  const groups = toolsByCategory();

  return (
    <header
      data-chrome="nav"
      className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-14">
        <Link href="/" className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Tezos Toolkit
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {ORDER.map((cat) => (
            <div key={cat} className="relative group">
              <button
                type="button"
                className="px-3 py-2 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                {CATEGORY_LABELS[cat]}
              </button>
              <div className="absolute left-0 top-full pt-1 hidden group-hover:block group-focus-within:block min-w-64">
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg p-1 max-h-96 overflow-y-auto">
                  {groups[cat].map((tool) => (
                    <Link
                      key={tool.slug}
                      href={tool.href}
                      className="flex items-baseline gap-2 px-3 py-1.5 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      <span className="text-zinc-900 dark:text-zinc-100">{tool.name}</span>
                      {tool.status === "planned" && (
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400">soon</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/history" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Token History
          </Link>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
