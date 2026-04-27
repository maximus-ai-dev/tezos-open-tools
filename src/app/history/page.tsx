import { getTokenInfo } from "@/lib/objkt";
import { getTokenTransfers, getTransactionsByIds } from "@/lib/tzkt";
import type { TzktTransfer, TzktTransaction } from "@/lib/tzkt";
import { BuyButton } from "@/components/common/BuyButton";
import {
  CONTRACTS,
  MARKETPLACE_NAMES,
  objktTokenLink,
  objktProfileLink,
} from "@/lib/constants";
import {
  formatDate,
  formatTez,
  ipfsToHttp,
  parseTokenInput,
  shortAddress,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; fa?: string; id?: string }>;
}

const BURN_ADDRESSES = new Set([
  "tz1burnburnburnburnburnburnburjAYjjX",
  "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg",
]);

const SALE_ENTRYPOINTS = new Set([
  "fulfill_ask",
  "collect",
  "buy",
  "execute_offer",
  "fulfill_offer",
  "settle_english_auction",
  "conclude_auction",
]);

const MARKETPLACE_ADDRESSES = new Set<string>(Object.values(CONTRACTS));

export default async function TokenHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const parsed =
    params.fa && params.id
      ? { fa: params.fa, tokenId: params.id }
      : params.q
        ? parseTokenInput(params.q)
        : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Token History</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Full transfer and sale history for any Tezos NFT.
        </p>
      </header>

      <SearchForm initial={params.q ?? (params.fa && params.id ? `${params.fa}:${params.id}` : "")} />

      {params.q && !parsed && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t parse that. Paste an objkt.com token URL, or use{" "}
          <code className="font-mono">KT1...:tokenId</code>.
        </p>
      )}

      {parsed && <TokenHistory fa={parsed.fa} tokenId={parsed.tokenId} />}
    </div>
  );
}

function SearchForm({ initial }: { initial: string }) {
  return (
    <form method="GET" action="/history" className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        name="q"
        defaultValue={initial}
        placeholder="https://objkt.com/tokens/KT1.../123 or KT1...:123"
        className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
      />
      <button
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        Look up
      </button>
    </form>
  );
}

async function TokenHistory({ fa, tokenId }: { fa: string; tokenId: string }) {
  const [info, transfers] = await Promise.all([
    getTokenInfo(fa, tokenId).catch(() => null),
    getTokenTransfers({ fa, tokenId, limit: 200 }).catch(() => [] as TzktTransfer[]),
  ]);

  if (!info && transfers.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-zinc-200 dark:border-zinc-800 p-6 text-sm text-zinc-600 dark:text-zinc-400">
        No data found for <code className="font-mono">{fa}:{tokenId}</code>.
      </div>
    );
  }

  const txIds = transfers
    .map((t) => t.transactionId)
    .filter((id): id is number => typeof id === "number");
  const transactions = await getTransactionsByIds({ ids: txIds }).catch(
    () => [] as TzktTransaction[],
  );
  const txById = new Map(transactions.map((tx) => [tx.id, tx]));

  return (
    <>
      <TokenHeader fa={fa} tokenId={tokenId} info={info} fallback={transfers[0] ?? null} />
      <HistoryTable transfers={transfers} txById={txById} />
    </>
  );
}

function TokenHeader({
  fa,
  tokenId,
  info,
  fallback,
}: {
  fa: string;
  tokenId: string;
  info: Awaited<ReturnType<typeof getTokenInfo>>;
  fallback: TzktTransfer | null;
}) {
  const name = info?.name ?? fallback?.token.metadata?.name ?? `Token ${tokenId}`;
  const thumb =
    ipfsToHttp(info?.thumbnail_uri) ??
    ipfsToHttp(info?.display_uri) ??
    ipfsToHttp(fallback?.token.metadata?.thumbnailUri) ??
    null;
  const collection = info?.fa?.name ?? fallback?.token.contract.alias ?? null;
  const supply = info?.supply ?? Number(fallback?.token.totalSupply ?? 0);
  const creators = info?.creators ?? [];

  const lowestListing = info?.listings_active?.[0];

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 w-32 h-32 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 relative">
          {thumb && (
            // Using <img> rather than next/image to avoid configuring remote IPFS gateways.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={name} className="w-full h-full object-cover" />
          )}
          {!thumb && <div className="w-full h-full" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-semibold truncate">{name}</h2>
            <a
              href={objktTokenLink(fa, tokenId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
            >
              View on objkt →
            </a>
          </div>
          {collection && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Collection: <span className="text-zinc-900 dark:text-zinc-100">{collection}</span>
            </p>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Supply: <span className="text-zinc-900 dark:text-zinc-100">{supply}</span>
          </p>
          {creators.length > 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              By:{" "}
              {creators.map((c, i) => (
                <span key={c.holder.address}>
                  {i > 0 && ", "}
                  <a
                    href={objktProfileLink(c.holder.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    {c.holder.alias ?? shortAddress(c.holder.address)}
                  </a>
                </span>
              ))}
            </p>
          )}
          {lowestListing && (
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Floor:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {formatTez(lowestListing.price)}
                </span>{" "}
                <span className="text-xs">
                  on {MARKETPLACE_NAMES[lowestListing.marketplace_contract] ?? "marketplace"}
                </span>
              </p>
              {lowestListing.bigmap_key !== null && (
                <BuyButton
                  marketplaceContract={lowestListing.marketplace_contract}
                  askId={lowestListing.bigmap_key}
                  priceMutez={lowestListing.price}
                  amountAvailable={lowestListing.amount_left}
                  tokenName={name}
                  variant="full"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function classifyTransfer(t: TzktTransfer, tx: TzktTransaction | undefined): {
  kind: "mint" | "sale" | "burn" | "transfer";
  price: number | null;
  marketplace: string | null;
} {
  if (!t.from || t.from.address === "tz0") {
    return { kind: "mint", price: null, marketplace: null };
  }
  if (t.to && BURN_ADDRESSES.has(t.to.address)) {
    return { kind: "burn", price: null, marketplace: null };
  }
  if (tx) {
    const targetAddr = tx.target?.address ?? "";
    const ep = tx.parameter?.entrypoint ?? "";
    if (MARKETPLACE_ADDRESSES.has(targetAddr) && (SALE_ENTRYPOINTS.has(ep) || tx.amount > 0)) {
      return { kind: "sale", price: tx.amount, marketplace: targetAddr };
    }
  }
  return { kind: "transfer", price: null, marketplace: null };
}

const KIND_BADGE: Record<string, string> = {
  mint: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  sale: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  burn: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  transfer: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
};

function HistoryTable({
  transfers,
  txById,
}: {
  transfers: TzktTransfer[];
  txById: Map<number, TzktTransaction>;
}) {
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
        Events ({transfers.length})
      </h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">When</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Event</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">From</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">To</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                Amount
              </th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => {
              const tx = t.transactionId ? txById.get(t.transactionId) : undefined;
              const { kind, price, marketplace } = classifyTransfer(t, tx);
              return (
                <tr
                  key={t.id}
                  className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {formatDate(t.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${KIND_BADGE[kind]}`}>
                      {kind}
                    </span>
                    {marketplace && (
                      <span className="ml-2 text-xs text-zinc-500">
                        {MARKETPLACE_NAMES[marketplace] ?? "marketplace"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {t.from ? (
                      <a
                        href={objktProfileLink(t.from.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-zinc-700 dark:text-zinc-300"
                        title={t.from.address}
                      >
                        {t.from.alias ?? shortAddress(t.from.address)}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {t.to ? (
                      <a
                        href={objktProfileLink(t.to.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-zinc-700 dark:text-zinc-300"
                        title={t.to.address}
                      >
                        {t.to.alias ?? shortAddress(t.to.address)}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">{t.amount}</td>
                  <td className="px-3 py-2 text-right text-zinc-900 dark:text-zinc-100 font-medium">
                    {price !== null ? formatTez(price) : <span className="text-zinc-400 font-normal">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

