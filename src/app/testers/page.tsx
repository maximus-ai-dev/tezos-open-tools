import Link from "next/link";
import { GITHUB_URL } from "@/lib/constants";

export const metadata = {
  title: "Testers — start here — Tezos Open Tools",
  description: "Onboarding for testers: how to try the beta safely and send useful feedback.",
};

export default function TestersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-zinc-700 dark:text-zinc-300">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Testers — start here
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          A 15-minute walkthrough for trying the beta safely and sending back useful feedback.
        </p>
      </header>

      <Section title="The ask">
        <p>
          Real wallets, real money — but small money. Use a low-value NFT you don&apos;t mind
          losing if something misbehaves. Feedback comes back to the maintainer via DM or a GitHub
          issue.
        </p>
        <p className="mt-3">
          This is not a paid program. The toolkit is open source, MIT licensed, and free forever —
          including for the maintainer running this deployment. If you find this useful, contribute
          a fix or a PR; that&apos;s the most valuable thing you can give back.
        </p>
      </Section>

      <Section title="Step 1 — Try the read-only stuff (no wallet, no risk)">
        <p>Hit a few of these and tell me what loads slowly, what looks broken, what&apos;s confusing.</p>
        <ul className="mt-3 space-y-1.5 list-disc pl-5">
          <li><L href="/topsales">Top Sales</L> — should show real recent sales with prices in ꜩ</li>
          <li><L href="/live">Live Feed</L> — should update with new sales every ~4 seconds</li>
          <li><L href="/history">Token History</L> — paste any objkt token URL into the search box</li>
          <li>
            <L href="/resale?address=tz1RikSsVF7CK1iFq12dYG11M2RXwKkEfECm">Your Collection</L> —
            try with your own wallet address
          </li>
          <li>
            <L href="/artist?address=tz1Q1ZtDEW87VfZMs3QFnYX5Lbh8wN2B5ypV">Artist Summary</L> — try
            with any artist&apos;s wallet
          </li>
          <li>
            <L href="/feed">Latest Mints</L>, <L href="/fxhash/sales">fxhash Sales</L>,{" "}
            <L href="/topsales?window=7d">Top Sales 7d</L>
          </li>
        </ul>
      </Section>

      <Section title="Step 2 — Connect a wallet (still read-only)">
        <p>
          Click <em>Connect wallet</em> top right. Pick Temple, Kukai, Umami — whatever you have.
          Once connected:
        </p>
        <ul className="mt-3 space-y-1.5 list-disc pl-5">
          <li><L href="/offers/manage">Your Offers</L> — outgoing offers (just looks)</li>
          <li><L href="/offers/received">Offers Received</L> — incoming offers on stuff you own</li>
          <li>
            <L href="/artist/sale">Manage Listings</L> — your active listings.{" "}
            <strong>Don&apos;t click cancel yet</strong>, just see if the list looks right.
          </li>
          <li><L href="/swap/batch">Bulk List</L> — should auto-load your held tokens</li>
        </ul>
      </Section>

      <Section title="Step 3 — Wallet-write, but cheap (the real test)">
        <p>
          <strong className="text-zinc-900 dark:text-zinc-100">
            Use a low-value NFT you own — 1 ꜩ or less.
          </strong>{" "}
          If something goes wrong it costs you nothing meaningful, but you&apos;ll have proven the
          actual signing flow works.
        </p>
        <ol className="mt-3 space-y-3 list-decimal pl-5">
          <li>
            <L href="/migrate/transfer">Transfer Tokens</L> — send 1 edition of a cheap NFT to one
            of your other wallets (or back to yourself). Watch for: the confirmation modal opens
            with the right info, your wallet popup shows the params, the op succeeds on tzkt.io.
          </li>
          <li>
            <L href="/artist/sale">Manage Listings</L> — cancel one cheap active listing. (You can
            re-list later for the same price.)
          </li>
          <li>
            <L href="/swap/batch">Bulk List</L> — list a single cheap token at, say, 99 ꜩ (high
            enough nobody buys by accident). Then immediately cancel it via Manage Listings.
          </li>
        </ol>
      </Section>

      <Section title="What to look for">
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Pages that don&apos;t load, hang forever, or show weird empty states</li>
          <li>The Connect Wallet flow — does it remember you across page reloads?</li>
          <li>Confirmation modals — do they show the right tokens, prices, addresses?</li>
          <li>Mobile layout if you use a phone</li>
          <li>Anything that feels confusing, mislabeled, or wrong</li>
        </ul>
      </Section>

      <Section title="How to report">
        <p>Either path works:</p>
        <ul className="mt-3 space-y-1.5 list-disc pl-5">
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Easy:</strong> DM the maintainer
            with screenshots + a one-line description. They&apos;ll translate it to GitHub.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Direct:</strong>{" "}
            <a
              href={`${GITHUB_URL}/issues/new/choose`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              File a GitHub issue
            </a>
            . Templates are pre-filled — just paste what you saw.
          </li>
        </ul>
        <p className="mt-3">
          For wallet-write bugs, please include the op hash from tzkt.io (every signed op gets one).
          That lets us see exactly what the chain saw.
        </p>
      </Section>

      <Section title="What this is built on">
        <p>
          Open-source (MIT), no logins, no analytics, no rate limits. The whole thing is at{" "}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {GITHUB_URL.replace("https://", "")}
          </a>
          . Fork it, add tools, run your own.
        </p>
      </Section>

      <Section title="Why it exists">
        <p>
          Most Tezos NFT tooling is closed-source and gated behind one author&apos;s discretion.
          When users get banned for arbitrary reasons, there&apos;s no recourse. This is the
          recourse — a clone of the same tools that nobody can lock you out of, because it&apos;s
          your own to run.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
        {title}
      </h2>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}

function L({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
      {children}
    </Link>
  );
}
