import Link from "next/link";
import { getHoldings } from "@/lib/objkt";
import type { HeldToken } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { isTezosAddress, shortAddress } from "@/lib/utils";
import { objktProfileLink } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function DiffPage({ searchParams }: PageProps) {
  const { a, b } = await searchParams;
  const validA = a && isTezosAddress(a);
  const validB = b && isTezosAddress(b);

  return (
    <PageShell
      title="Wallet Diff"
      description="Compare two Tezos wallets — what they share, what each holds alone, and which artists overlap."
    >
      <DiffForm a={a ?? ""} b={b ?? ""} />
      {(a || b) && (!validA || !validB) && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Need two valid Tezos addresses.
        </p>
      )}
      {validA && validB && <Diff a={a!} b={b!} />}
    </PageShell>
  );
}

function DiffForm({ a, b }: { a: string; b: string }) {
  return (
    <form method="GET" action="/diff" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <input
        type="text"
        name="a"
        defaultValue={a}
        placeholder="tz1... wallet A"
        className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
      />
      <input
        type="text"
        name="b"
        defaultValue={b}
        placeholder="tz1... wallet B"
        className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
      />
      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Diff
        </button>
      </div>
    </form>
  );
}

async function Diff({ a, b }: { a: string; b: string }) {
  if (a === b) {
    return <p className="mt-6 text-sm text-zinc-500">Same address on both sides — nothing to diff.</p>;
  }

  const [hA, hB] = await Promise.all([
    getHoldings(a, { limit: 200 }).catch(() => null),
    getHoldings(b, { limit: 200 }).catch(() => null),
  ]);

  if (!hA || !hB) {
    return <p className="mt-6 text-sm text-zinc-500">Could not load holdings for one or both wallets.</p>;
  }

  const keysA = new Set(hA.held.map(tokenKey));
  const keysB = new Set(hB.held.map(tokenKey));

  const both = hA.held.filter((h) => keysB.has(tokenKey(h)));
  const onlyA = hA.held.filter((h) => !keysB.has(tokenKey(h)));
  const onlyB = hB.held.filter((h) => !keysA.has(tokenKey(h)));

  // Shared artists: count combined holdings each side has from the same creator.
  type ArtistRow = { address: string; alias: string | null; aCount: number; bCount: number };
  const artists = new Map<string, ArtistRow>();
  for (const h of hA.held) {
    const c = h.token.creators[0]?.holder;
    if (!c) continue;
    const r = artists.get(c.address) ?? { address: c.address, alias: c.alias ?? null, aCount: 0, bCount: 0 };
    r.aCount++;
    if (c.alias) r.alias = c.alias;
    artists.set(c.address, r);
  }
  for (const h of hB.held) {
    const c = h.token.creators[0]?.holder;
    if (!c) continue;
    const r = artists.get(c.address) ?? { address: c.address, alias: c.alias ?? null, aCount: 0, bCount: 0 };
    r.bCount++;
    if (c.alias) r.alias = c.alias;
    artists.set(c.address, r);
  }
  const sharedArtists = [...artists.values()]
    .filter((r) => r.aCount > 0 && r.bCount > 0)
    .sort((x, y) => y.aCount + y.bCount - (x.aCount + x.bCount));

  // Shared collections (same FA contract, possibly different tokens)
  const faA = new Map<string, { count: number; name: string | null }>();
  const faB = new Map<string, { count: number; name: string | null }>();
  for (const h of hA.held) {
    const r = faA.get(h.token.fa_contract) ?? { count: 0, name: h.token.fa?.name ?? null };
    r.count++;
    faA.set(h.token.fa_contract, r);
  }
  for (const h of hB.held) {
    const r = faB.get(h.token.fa_contract) ?? { count: 0, name: h.token.fa?.name ?? null };
    r.count++;
    faB.set(h.token.fa_contract, r);
  }
  const sharedFas = [...faA.entries()]
    .filter(([fa]) => faB.has(fa))
    .map(([fa, r]) => ({
      fa,
      name: r.name ?? faB.get(fa)?.name ?? null,
      a: r.count,
      b: faB.get(fa)!.count,
    }))
    .sort((x, y) => y.a + y.b - (x.a + x.b));

  return (
    <>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Wallet A" value={hA.alias ?? shortAddress(a)} sub={`${hA.held.length} held`} href={`/wallet/${a}`} />
        <Stat label="Wallet B" value={hB.alias ?? shortAddress(b)} sub={`${hB.held.length} held`} href={`/wallet/${b}`} />
        <Stat label="Both hold" value={String(both.length)} sub="exact same token" />
        <Stat
          label="Overlap"
          value={
            hA.held.length + hB.held.length === 0
              ? "—"
              : `${((both.length / Math.max(1, Math.min(hA.held.length, hB.held.length))) * 100).toFixed(0)}%`
          }
          sub="of the smaller side"
        />
      </div>

      {both.length > 0 && (
        <Section title={`Both hold (${both.length})`}>
          <TokenGrid>
            {both.slice(0, 18).map((h) => (
              <TokenCard
                key={tokenKey(h)}
                token={{
                  fa: h.token.fa_contract,
                  tokenId: h.token.token_id,
                  name: h.token.name,
                  thumbnailUri: h.token.thumbnail_uri,
                  displayUri: h.token.display_uri,
                  supply: h.token.supply,
                }}
                priceMutez={h.token.listings_active[0]?.price ?? null}
              />
            ))}
          </TokenGrid>
          {both.length > 18 && (
            <p className="mt-2 text-xs text-zinc-500">+{both.length - 18} more shared tokens</p>
          )}
        </Section>
      )}

      {sharedArtists.length > 0 && (
        <Section title={`Shared artists (${sharedArtists.length})`}>
          <ul className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
            {sharedArtists.slice(0, 20).map((r) => (
              <li key={r.address} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                <a
                  href={objktProfileLink(r.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs hover:underline truncate"
                  title={r.address}
                >
                  {r.alias ?? shortAddress(r.address)}
                </a>
                <span className="text-xs text-zinc-500 whitespace-nowrap">
                  A: <span className="text-zinc-900 dark:text-zinc-100">{r.aCount}</span> · B:{" "}
                  <span className="text-zinc-900 dark:text-zinc-100">{r.bCount}</span>
                </span>
              </li>
            ))}
          </ul>
          {sharedArtists.length > 20 && (
            <p className="mt-2 text-xs text-zinc-500">+{sharedArtists.length - 20} more shared artists</p>
          )}
        </Section>
      )}

      {sharedFas.length > 0 && (
        <Section title={`Shared collections (${sharedFas.length})`}>
          <ul className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
            {sharedFas.slice(0, 20).map((r) => (
              <li key={r.fa} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{r.name ?? shortAddress(r.fa)}</span>
                <span className="text-xs text-zinc-500 whitespace-nowrap">
                  A: <span className="text-zinc-900 dark:text-zinc-100">{r.a}</span> · B:{" "}
                  <span className="text-zinc-900 dark:text-zinc-100">{r.b}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Only ${shortAddress(a)} holds (${onlyA.length})`}>
        {onlyA.length === 0 ? (
          <p className="text-sm text-zinc-500">B holds everything A holds.</p>
        ) : (
          <>
            <TokenGrid>
              {onlyA.slice(0, 12).map((h) => (
                <TokenCard
                  key={tokenKey(h)}
                  token={{
                    fa: h.token.fa_contract,
                    tokenId: h.token.token_id,
                    name: h.token.name,
                    thumbnailUri: h.token.thumbnail_uri,
                    displayUri: h.token.display_uri,
                    supply: h.token.supply,
                  }}
                  priceMutez={h.token.listings_active[0]?.price ?? null}
                />
              ))}
            </TokenGrid>
            {onlyA.length > 12 && (
              <p className="mt-2 text-xs text-zinc-500">+{onlyA.length - 12} more</p>
            )}
          </>
        )}
      </Section>

      <Section title={`Only ${shortAddress(b)} holds (${onlyB.length})`}>
        {onlyB.length === 0 ? (
          <p className="text-sm text-zinc-500">A holds everything B holds.</p>
        ) : (
          <>
            <TokenGrid>
              {onlyB.slice(0, 12).map((h) => (
                <TokenCard
                  key={tokenKey(h)}
                  token={{
                    fa: h.token.fa_contract,
                    tokenId: h.token.token_id,
                    name: h.token.name,
                    thumbnailUri: h.token.thumbnail_uri,
                    displayUri: h.token.display_uri,
                    supply: h.token.supply,
                  }}
                  priceMutez={h.token.listings_active[0]?.price ?? null}
                />
              ))}
            </TokenGrid>
            {onlyB.length > 12 && (
              <p className="mt-2 text-xs text-zinc-500">+{onlyB.length - 12} more</p>
            )}
          </>
        )}
      </Section>
    </>
  );
}

function tokenKey(h: HeldToken): string {
  return `${h.token.fa_contract}:${h.token.token_id}`;
}

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">{title}</h2>
      {children}
    </section>
  );
}
