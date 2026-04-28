import { GITHUB_URL, REFERRAL_WALLET } from "@/lib/constants";

export const metadata = {
  title: "FAQ — Tezos Open Tools",
  description: "Common questions about safety, open source, monetization.",
};

const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "What is this?",
    a: (
      <>
        An open-source suite of tools for Tezos NFT collectors and artists — many of them direct
        clones of features in closed-source toolkits. Free forever, MIT licensed, self-hostable.
        See <A href="/why">why this exists</A>.
      </>
    ),
  },
  {
    q: "Is it safe to connect my wallet?",
    a: (
      <>
        Yes, with the standard Web3 caveats. We use{" "}
        <A href="https://docs.walletbeacon.io/" external>Beacon SDK</A> — your private keys never
        leave your wallet (Temple, Kukai, Umami). When you sign a transaction, your wallet shows
        the operation params and asks you to confirm. We never see your keys, and we have no
        ability to bypass the wallet&apos;s confirmation prompt.
      </>
    ),
  },
  {
    q: "Will you ever ask me to enter my private key?",
    a: (
      <>
        <strong>No.</strong> If a tool ever asks you to paste a private key (whether it&apos;s
        labeled &ldquo;edsk…&rdquo;, &ldquo;spending key&rdquo;, or anything else) into a browser
        form,{" "}
        <strong>that tool is doing something dangerous and you should close the tab</strong>.
        Including ours. We do not, and will never, accept private keys.
      </>
    ),
  },
  {
    q: "Can you ban me?",
    a: (
      <>
        No, in the strongest possible sense.{" "}
        <strong>The whole point of the project is that nobody can.</strong> The source is on{" "}
        <A href={GITHUB_URL} external>GitHub</A>. If this deployment ever blocks you (it
        won&apos;t — there&apos;s no auth or rate-limit code anywhere), spin up your own:
        Vercel, Netlify, your laptop. The code is identical. Nobody owes you a deployment, and
        nobody can take yours away.
      </>
    ),
  },
  {
    q: "What if the maintainer disappears?",
    a: (
      <>
        Then you fork the repo and someone else picks it up — or you keep using the last good
        deployment until objkt&apos;s ABI changes. The code is MIT, anyone can take it over. Worst
        case, you have a snapshot of working tooling that doesn&apos;t need to phone home.
      </>
    ),
  },
  {
    q: "Why are some tools labeled “stub”?",
    a: (
      <>
        Three tools (<A href="/pin">/pin</A>, <A href="/genart/batch">/genart/batch</A>,{" "}
        <A href="/barter">/barter</A>) need contract research we haven&apos;t finished — the page
        for each says exactly why. Better to be loud about gaps than to fake-implement and lose
        someone&apos;s tokens. Community PRs welcome.
      </>
    ),
  },
  {
    q: "How is this monetized?",
    a: (
      <>
        Every link to objkt.com routes through a configurable referral wallet (
        <code className="font-mono text-xs">{REFERRAL_WALLET}</code> by default). When someone buys
        through these links, the deployment&apos;s referral wallet earns the marketplace&apos;s
        standard share. Same monetization model the closed-source tools use; the difference is{" "}
        <strong>you can change the wallet to your own in one line</strong> (
        <code className="font-mono text-xs">src/lib/constants.ts</code>) if you self-host.
      </>
    ),
  },
  {
    q: "Why is the site in beta?",
    a: (
      <>
        Wallet-write tools are validated against mainnet RPC simulation, but real-browser sign-flows
        across Temple/Kukai/Umami have only been lightly tested. The beta banner stays until that
        UX is solid. If you find a bug — including just &ldquo;this is confusing&rdquo; —{" "}
        <A href={`${GITHUB_URL}/issues/new/choose`} external>file an issue</A> or DM the maintainer.
        See the <A href="/testers">tester program</A> for ꜩ bounties.
      </>
    ),
  },
  {
    q: "Do you have an autobuy / concierge feature?",
    a: (
      <>
        No, and we won&apos;t. Autobuy needs a key that can sign without asking, which means either
        a key in your browser&apos;s localStorage (drainable by any malicious extension) or a key
        on someone&apos;s server (drainable by the operator). We&apos;re building a watchlist +
        browser notification tool instead — when a watched artist mints, you get a ping, you click
        Buy, your wallet asks you to sign. 1 second slower; 0% of the security risk.{" "}
        <A href="/why">More on this</A>.
      </>
    ),
  },
  {
    q: "Do you have an FAQ section about how this works on mobile / Brave / Safari / etc?",
    a: (
      <>
        Not yet. Browser/wallet compat is exactly what testers will surface. Once we have feedback,
        we&apos;ll write it up. If you hit something specific, file an issue.
      </>
    ),
  },
  {
    q: "How do I contribute?",
    a: (
      <>
        Read <A href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`} external>CONTRIBUTING.md</A> in the
        repo. The most impactful contributions right now: wiring up the three stubs (pin, barter,
        genart-batch), mobile responsive sweep, and i18n.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-zinc-700 dark:text-zinc-300">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          FAQ
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Common questions. For the long-form rationale, see <A href="/why">why this exists</A>.
        </p>
      </header>

      <div className="space-y-7">
        {QUESTIONS.map((item, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
              {item.q}
            </h2>
            <div className="leading-relaxed">{item.a}</div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-zinc-500">
        Question not answered?{" "}
        <A href={`${GITHUB_URL}/issues/new/choose`} external>
          Open an issue
        </A>{" "}
        or DM the maintainer.
      </p>
    </div>
  );
}

function A({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
    >
      {children}
    </a>
  );
}
