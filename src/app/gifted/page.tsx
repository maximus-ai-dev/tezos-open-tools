import { getAccountTokenTransfers, getTransactionsByIds } from "@/lib/tzkt";
import type { TzktTransfer, TzktTransaction } from "@/lib/tzkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { CONTRACTS, objktProfileLink } from "@/lib/constants";
import { formatDate, isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

const MARKETPLACE_ADDRESSES = new Set<string>(Object.values(CONTRACTS));

export default async function GiftedPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);

  return (
    <PageShell
      title="Gifted Tokens"
      description="Tokens this wallet received from another wallet directly — not minted, not bought through a marketplace, not transferred from itself. A heuristic for 'things people sent you', useful for auditing what you actually collected vs received."
    >
      <WalletInputForm action="/gifted" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <Gifted address={address!} />}

      <p className="mt-10 text-xs text-zinc-500 leading-relaxed">
        <strong className="text-zinc-700 dark:text-zinc-300">How we detect:</strong> we fetch the
        last ~1000 incoming FA2 transfers via TzKT, then exclude (a) mints, (b) any transfer routed
        through a known marketplace contract, (c) transfers tied to a transaction that targeted a
        marketplace (i.e. you bought it). What&apos;s left is direct wallet-to-wallet transfers
        without a marketplace settlement — almost always gifts, occasionally weird airdrops, very
        occasionally something else (e.g. a contract you interacted with sending you something
        back). Use your judgment.
      </p>
    </PageShell>
  );
}

interface GiftedItem {
  transfer: TzktTransfer;
  fromAddr: string;
  fromAlias: string | null;
}

async function Gifted({ address }: { address: string }) {
  const transfersIn = await getAccountTokenTransfers({
    account: address,
    direction: "to",
    limit: 1000,
  }).catch(() => [] as TzktTransfer[]);

  if (transfersIn.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No incoming token transfers found.</p>;
  }

  // Look up the parent transactions in batch so we can filter out marketplace settlements.
  const txIds = transfersIn
    .map((t) => t.transactionId)
    .filter((id): id is number => typeof id === "number");
  const txs = await getTransactionsByIds({ ids: txIds }).catch(
    () => [] as TzktTransaction[],
  );
  const txById = new Map(txs.map((tx) => [tx.id, tx]));

  const candidates: GiftedItem[] = [];
  for (const t of transfersIn) {
    const fromAddr = t.from?.address;
    if (!fromAddr) continue; // mint
    if (fromAddr === address) continue; // self-transfer
    if (MARKETPLACE_ADDRESSES.has(fromAddr)) continue; // marketplace settling on behalf of someone

    const tx = t.transactionId ? txById.get(t.transactionId) : undefined;
    if (tx) {
      const target = tx.target?.address;
      if (target && MARKETPLACE_ADDRESSES.has(target)) {
        continue; // user bought via fulfill_ask / fulfill_offer / collect — not a gift
      }
    }

    candidates.push({
      transfer: t,
      fromAddr,
      fromAlias: t.from?.alias ?? null,
    });
  }

  if (candidates.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No gifted-style transfers in the last ~1000 incoming transfers.
      </p>
    );
  }

  // Group by sender to surface "your most generous senders" stat.
  const bySender = new Map<string, number>();
  for (const c of candidates) {
    bySender.set(c.fromAddr, (bySender.get(c.fromAddr) ?? 0) + 1);
  }
  const topSenders = [...bySender.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <div className="mt-6 mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Likely gifts:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{candidates.length}</span>
        </span>
        <span>
          From{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{bySender.size}</span>{" "}
          unique senders
        </span>
      </div>

      {topSenders.length > 0 && (
        <div className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Top senders</h3>
          <ul className="text-sm space-y-1">
            {topSenders.map(([addr, count]) => (
              <li key={addr} className="flex justify-between gap-2">
                <a
                  href={objktProfileLink(addr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-mono text-xs"
                  title={addr}
                >
                  {shortAddress(addr)}
                </a>
                <span className="text-zinc-500">{count} gift{count === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TokenGrid>
        {candidates.slice(0, 60).map((c) => {
          const t = c.transfer;
          return (
            <TokenCard
              key={`${t.id}`}
              token={{
                fa: t.token.contract.address,
                tokenId: t.token.tokenId,
                name: t.token.metadata?.name ?? null,
                thumbnailUri: t.token.metadata?.thumbnailUri ?? null,
                displayUri: t.token.metadata?.displayUri ?? null,
                artistAddress: c.fromAddr,
                artistAlias: c.fromAlias,
              }}
              badge={`from ${c.fromAlias ?? shortAddress(c.fromAddr)}`}
              marketplaceLabel={formatDate(t.timestamp)}
            />
          );
        })}
      </TokenGrid>

      {candidates.length > 60 && (
        <p className="mt-4 text-xs text-zinc-500">
          Showing first 60 of {candidates.length} candidates. Older transfers truncated.
        </p>
      )}
    </>
  );
}
