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
            form. Their FAQ has a whole section reassuring users about it. Quoting verbatim:
          </p>
          <Quote>
            you need to enter your private key, which is specific to that wallet address : IT&apos;S
            NOT YOUR SEED WORDS
          </Quote>
          <p className="mt-3">
            <em>It doesn&apos;t matter that it isn&apos;t a seed phrase.</em> A spending key in a
            browser is one malicious extension, one XSS, or one screen-share away from being
            drained. Their reassurance &mdash; &ldquo;your private key never leaves your
            browser&rdquo; &mdash; treats &ldquo;your browser&rdquo; like a trust boundary. It
            isn&apos;t. Every browser extension you&apos;ve ever installed sees your localStorage.
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
            . Your keys live in your wallet app (Temple, Kukai, Umami) and never enter our pages.
            Every transaction is signed inside your wallet, with your wallet&apos;s confirmation,{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">not in our JavaScript</strong>.
          </p>
        </Subsection>

        <Subsection title="2. We don't gate features behind owning specific NFTs.">
          <p>The same toolkit gates &ldquo;advanced&rdquo; features behind owning the maintainer&apos;s artwork. Quoting verbatim:</p>
          <Quote>
            some advanced features are perks for collectors of my works: any person owning one or
            more of 1/1 or multi-editions artworks
          </Quote>
          <p className="mt-3">
            That&apos;s pay-to-tool with a buyback. Anyone the maintainer doesn&apos;t want using
            their tools: blocked. Their answer to &ldquo;Can I be banned?&rdquo;:
          </p>
          <Quote>
            For whatever personal reason I could have, If I don&apos;t want anymore to share some or
            all of these tools with you, then I will block your wallet, without any explaination or
            notification
          </Quote>
          <p className="mt-3">
            Buying their NFT &mdash; the entry fee for the &ldquo;perks&rdquo; &mdash; doesn&apos;t
            change the kick-without-notice clause. You bought a token. You did not buy due process.
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
            Some tools offer automatic NFT purchases when watched artists drop. To do that, the
            tool needs a key that can sign without asking the user each time. Either:
          </p>
          <ul className="mt-2 mb-3 list-disc pl-5 space-y-1">
            <li>It&apos;s stored client-side (the private-key-in-form anti-pattern from #1), or</li>
            <li>It&apos;s held server-side, where the tool&apos;s operator can drain you whenever they want.</li>
          </ul>
          <p>
            Our alternative is a watchlist: when a watched artist mints, the activity shows up in{" "}
            <a href="/follow" className="text-blue-600 dark:text-blue-400 hover:underline">/follow</a>
            ; you click Buy; your wallet asks you to sign. A few seconds slower than autobuy. Zero
            key access required.{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">We choose it.</strong>
          </p>
        </Subsection>

        <Subsection title="4. We don't tell users they have no rights.">
          <p>The same toolkit&apos;s FAQ says, verbatim:</p>
          <Quote>
            using any of these tools don&apos;t entitle you to any right or anything else, no
            warranty of any kind is provided
          </Quote>
          <Quote>
            I don&apos;t ask you anything, you don&apos;t have anything to pay, so I don&apos;t owe
            you anything AT ALL
          </Quote>
          <p className="mt-3">
            That&apos;s a maintainer publicly setting the floor for how they&apos;ll treat users:
            no obligations, no notice, no recourse. Combined with #2, the position is &ldquo;buy my
            NFT for the perks, and I owe you nothing for it, and I can revoke at any time.&rdquo;
          </p>
          <p className="mt-3">
            We don&apos;t need to make these claims. The MIT license already says no warranty &mdash;{" "}
            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              read it
            </a>
            . But it&apos;s the same disclaimer every open-source project ships with, and the
            crucial difference is: <strong className="text-zinc-900 dark:text-zinc-100">you have
            the source.</strong> If we ever stop maintaining it, you maintain it. If we ever start
            misbehaving, you fork. Rights you derive from the GPL or MIT or BSD are real because
            the code is the contract.
          </p>
        </Subsection>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          Receipts
        </h2>
        <p className="mb-3">
          Everything quoted above is from{" "}
          <a
            href="https://nftbiker.xyz/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            nftbiker.xyz/faq
          </a>{" "}
          (verified at time of writing). Read the source for context. We&apos;re not paraphrasing
          and we&apos;re not editing &mdash; the wording is theirs.
        </p>
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

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-3 border-l-4 border-amber-400 pl-4 italic text-zinc-700 dark:text-zinc-300">
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}
