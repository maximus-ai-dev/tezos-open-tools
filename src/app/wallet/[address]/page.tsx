import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getHoldings,
  getCreations,
  getSellerListings,
  getSalesBySeller,
} from "@/lib/objkt";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { WatchButton } from "@/components/common/WatchButton";
import { formatTez, isTezosAddress, shortAddress } from "@/lib/utils";
import { objktProfileLink, MARKETPLACE_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { address } = await params;
  if (!isTezosAddress(address)) return { title: "Wallet — invalid" };
  return {
    title: `${shortAddress(address)} — Tezos wallet profile`,
    description: `Read-only on-chain profile for ${address}: holdings, creations, listings, recent sales.`,
  };
}

export default async function WalletProfilePage({ params }: PageProps) {
  const { address } = await params;
  if (!isTezosAddress(address)) notFound();

  const [holdings, creations, listings, sales] = await Promise.all([
    getHoldings(address, { limit: 60 }).catch(() => null),
    getCreations(address, { limit: 60 }).catch(() => []),
    getSellerListings(address, { limit: 200 }).catch(() => []),
    getSalesBySeller(address, { limit: 100 }).catch(() => []),
  ]);

  const heldCount = holdings?.held.length ?? 0;
  const heldFloorSum =
    holdings?.held.reduce((s, h) => s + (h.token.listings_active[0]?.price ?? 0), 0) ?? 0;
  const creationsCount = creations.length;
  const listingsValue = listings.reduce((s, l) => s + l.price, 0);
  const totalSoldValue = sales.reduce((s, x) => s + (x.price_xtz ?? x.price ?? 0), 0);

  const alias = holdings?.alias ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {alias ?? shortAddress(address)}
            </h1>
            <div className="mt-1 text-xs font-mono text-zinc-500 break-all">
              <a
                href={objktProfileLink(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {address}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WatchButton address={address} label={alias ?? undefined} />
            <a
              href={objktProfileLink(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              objkt ↗
            </a>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Tokens held" value={String(heldCount)} sub={`floor ≈ ${formatTez(heldFloorSum)}`} />
        <Stat label="Created" value={String(creationsCount)} sub={creationsCount === 60 ? "60+ shown" : undefined} />
        <Stat label="Listings" value={String(listings.length)} sub={`asking ≈ ${formatTez(listingsValue)}`} />
        <Stat
          label="Lifetime sold"
          value={String(sales.length)}
          sub={`≈ ${formatTez(totalSoldValue)}`}
        />
      </div>

      {creations.length > 0 && (
        <Section
          title="Recent creations"
          link={{ href: `/gallery?address=${address}`, label: "Full gallery →" }}
        >
          <TokenGrid>
            {creations.slice(0, 12).map((t) => (
              <TokenCard
                key={`${t.fa_contract}:${t.token_id}`}
                token={{
                  fa: t.fa_contract,
                  tokenId: t.token_id,
                  name: t.name,
                  thumbnailUri: t.thumbnail_uri,
                  displayUri: t.display_uri,
                  supply: t.supply,
                }}
                priceMutez={t.listings_active[0]?.price ?? null}
                marketplaceLabel={
                  t.listings_active[0]?.marketplace_contract
                    ? MARKETPLACE_NAMES[t.listings_active[0].marketplace_contract]
                    : null
                }
              />
            ))}
          </TokenGrid>
        </Section>
      )}

      {holdings && holdings.held.length > 0 && (
        <Section
          title="Recently collected"
          link={{ href: `/resale?address=${address}`, label: "Full collection →" }}
        >
          <TokenGrid>
            {holdings.held.slice(0, 12).map((h) => {
              const c = h.token.creators[0]?.holder;
              return (
                <TokenCard
                  key={`${h.token.fa_contract}:${h.token.token_id}`}
                  token={{
                    fa: h.token.fa_contract,
                    tokenId: h.token.token_id,
                    name: h.token.name,
                    thumbnailUri: h.token.thumbnail_uri,
                    displayUri: h.token.display_uri,
                    artistAddress: c?.address ?? null,
                    artistAlias: c?.alias ?? null,
                    supply: h.token.supply,
                  }}
                  priceMutez={h.token.listings_active[0]?.price ?? null}
                  marketplaceLabel={
                    h.token.listings_active[0]?.marketplace_contract
                      ? MARKETPLACE_NAMES[h.token.listings_active[0].marketplace_contract]
                      : null
                  }
                />
              );
            })}
          </TokenGrid>
        </Section>
      )}

      {sales.length > 0 && (
        <Section title="Recent sales (as seller)">
          <ul className="space-y-1 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">
            {sales.slice(0, 8).map((s) => (
              <li
                key={s.id}
                className="flex justify-between gap-2 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded"
              >
                <span className="truncate">{s.token?.name ?? `#${s.token?.token_id ?? ""}`}</span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatTez(s.price_xtz ?? s.price)}{" "}
                  <span className="text-xs">to {shortAddress(s.buyer_address ?? "")}</span>{" "}
                  <span className="text-xs text-zinc-400">{s.timestamp.slice(0, 10)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          ["/compare", "Compare"],
          ["/fans", "Fans"],
          ["/discovery", "Linked wallets"],
          ["/artist", "Artist summary"],
          ["/burned", "Burns"],
          ["/flex", "Flex"],
          ["/follow", "Add to watch"],
          ["/gifted", "Gifted"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={`${href}?address=${address}`}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-center hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({
  title,
  link,
  children,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
