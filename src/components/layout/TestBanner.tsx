import { GITHUB_URL } from "@/lib/constants";

/**
 * Persistent banner shown at the top of every page during the beta period.
 * Live mainnet — testers should know what they're signing into. Not dismissible
 * by design; this disappears when we cut a 1.0 release.
 */
export function TestBanner() {
  return (
    <div
      data-chrome="banner"
      className="bg-amber-100 dark:bg-amber-950 border-b-2 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
        <span className="font-semibold whitespace-nowrap">
          ⚠ Beta — use at your own risk
        </span>
        <span className="text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
          These tools sign real Tezos transactions on mainnet. Test with low-value assets first,
          double-check operation hashes on{" "}
          <a
            href="https://tzkt.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            tzkt.io
          </a>
          , and{" "}
          <a
            href={`${GITHUB_URL}/issues/new/choose`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline font-medium"
          >
            report any bug you find
          </a>
          .
        </span>
      </div>
    </div>
  );
}
