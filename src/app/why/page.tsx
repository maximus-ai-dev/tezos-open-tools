import Link from "next/link";
import { GITHUB_URL } from "@/lib/constants";

export const metadata = {
  title: "Why — Tezos NFT Toolkit",
  description: "Why an open-source clone exists. Specifically, what we don't do.",
};

export default function WhyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-zinc-700 dark:text-zinc-300">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
          Why open is better than gated
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          The Tezos NFT community runs on a small number of closed-source tools. When their authors
          decide to ban someone — for any reason or no reason — there&apos;s no recourse. No appeal.
          No ability to fork and run your own version.
        </p>
        <p className="text-zinc-900 dark:text-zinc-100 font-medium mt-3">This project changes that.</p>
      </header>

      <section className="mb-10">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          What we don&apos;t do
        </h2>

        <Subsection title="1. We don't ask for your private key. Ever.">
          <p>
            The largest closed-source toolkit in this space asks users to paste their{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">private key</strong> into a web
            form to enable certain features. Their FAQ has a whole section reassuring users it
            isn&apos;t their seed phrase.{" "}
            <em>It doesn&apos;t matter that it isn&apos;t a seed phrase.</em> A spending key in
            browser localStorage is one XSS, one malicious extension, or one stale tab away from
            being drained.
          </p>
          <p className="mt-3">
            We use{" "}
            <a
              href="https://docs.walletbeacon.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Beacon SDK
            </a>
            . Your keys live in your wallet (Temple, Kukai, Umami) and never enter our pages. Every
            transaction is signed inside your wallet, with your wallet&apos;s confirmation,{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">not in our JavaScript</strong>.
          </p>
        </Subsection>

        <Subsection title="2. We don't gate features behind owning specific NFTs.">
          <p>
            The same toolkit gates &ldquo;advanced&rdquo; features behind purchasing the
            maintainer&apos;s artwork. Their access page literally says:
          </p>
          <blockquote className="mt-3 mb-3 border-l-4 border-amber-400 pl-4 italic text-zinc-700 dark:text-zinc-300">
            &ldquo;The creator reserves the right to revoke access either individually or globally,
            without any explanation.&rdquo;
          </blockquote>
          <p>
            In plain English: you bought my NFT, I can take away your access whenever I want, for
            any reason, and I owe you no explanation.
          </p>
          <p className="mt-3">
            Every tool here is free, forever, for everyone.{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              There is no membership. There are no perks. There is nothing to revoke.
            </strong>
          </p>
        </Subsection>

        <Subsection title="3. We don't run a “concierge” autobuyer.">
          <p>
            Some tools offer automatic NFT purchases when watched artists drop. To do that, the tool
            needs a key that can sign without asking. Either:
          </p>
          <ul className="mt-2 mb-3 list-disc pl-5 space-y-1">
            <li>
              It&apos;s stored client-side (the private-key-in-form anti-pattern from #1), or
            </li>
            <li>It&apos;s held server-side, in which case the tool&apos;s operator can drain you.</li>
          </ul>
          <p>
            Neither is acceptable. Our planned alternative is a watchlist + browser notification
            tool: when a watched artist mints, you get a notification; you click Buy; your wallet
            asks you to sign. The 1-second delay is the only meaningful difference between us and
            them.{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">We choose it.</strong>
          </p>
        </Subsection>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          What we do instead
        </h2>
        <ul className="space-y-3 list-disc pl-5">
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Open source. MIT.</strong> The
            entire toolkit is at{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {GITHUB_URL.replace("https://", "")}
            </a>
            . Audit it. Fork it. Send PRs. Run your own copy.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Self-hostable on Vercel in one click.</strong>{" "}
            If you don&apos;t trust this deployment, deploy your own. The code is the same.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Beacon-only signing.</strong> Your
            wallet is the only thing that ever holds your keys.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">No accounts, no logins, no ads, no analytics, no rate limits.</strong>{" "}
            We read public chain APIs (TzKT, objkt&apos;s GraphQL) and render the answers.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Confirmation modals before every signature.</strong>{" "}
            For every wallet-write tool, we show you the exact tokens, prices, and addresses
            you&apos;re about to commit to before opening your wallet&apos;s sign prompt.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Honest about the gaps.</strong>{" "}
            Tools we haven&apos;t implemented show a stub page that says exactly why. No vapor, no
            premium-features-coming-soon™.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Transparent monetization.</strong>{" "}
            Every link to objkt.com routes through a configurable referral wallet. The deployer
            (default: this site&apos;s author) earns the marketplace&apos;s standard referral fee
            on purchases made through the toolkit. You can change the wallet to your own in one
            line:{" "}
            <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">
              REFERRAL_WALLET
            </code>{" "}
            in <code className="text-xs font-mono">src/lib/constants.ts</code>.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          The deal we propose
        </h2>
        <p>
          Use these tools. If they&apos;re useful, share them. If they&apos;re broken, file an
          issue. If you want a feature, send a PR or pay someone to send a PR. If you don&apos;t
          like the maintainer, fork the repo and host your own.
        </p>
        <p className="mt-3">
          Nobody can take this away from you, because it isn&apos;t anybody&apos;s to take. That&apos;s the deal.
        </p>
      </section>

      <p className="text-sm text-zinc-500">
        Read the <Link href="/faq" className="text-blue-600 dark:text-blue-400 hover:underline">FAQ</Link>,
        try the <Link href="/testers" className="text-blue-600 dark:text-blue-400 hover:underline">tester program</Link>,
        or just <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">browse the tools</Link>.
      </p>
    </article>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h3>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
