import { getHoldings } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string; limit?: string }>;
}

export default async function FlexPage({ searchParams }: PageProps) {
  const { address, limit } = await searchParams;
  const valid = address && isTezosAddress(address);
  const cap = Math.min(Math.max(Number(limit) || 60, 12), 240);

  return (
    <PageShell
      title="Flex"
      description="Show off a wallet's collection in a clean grid — no prices, no chrome, just the art."
    >
      <WalletInputForm action="/flex" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <Flex address={address!} limit={cap} />}
    </PageShell>
  );
}

async function Flex({ address, limit }: { address: string; limit: number }) {
  const result = await getHoldings(address, { limit }).catch(() => null);
  if (!result || result.held.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No tokens found in this wallet.</p>;
  }
  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {result.alias ?? shortAddress(address)}
        </span>{" "}
        — {result.held.length} pieces shown
      </p>
      <TokenGrid>
        {result.held.map((h) => {
          const creator = h.token.creators[0]?.holder;
          return (
            <TokenCard
              key={`${h.token.fa_contract}:${h.token.token_id}`}
              token={{
                fa: h.token.fa_contract,
                tokenId: h.token.token_id,
                name: h.token.name,
                thumbnailUri: h.token.thumbnail_uri,
                displayUri: h.token.display_uri,
                artistAddress: creator?.address ?? null,
                artistAlias: creator?.alias ?? null,
                supply: h.token.supply,
              }}
              badge={h.quantity > 1 ? `×${h.quantity}` : null}
            />
          );
        })}
      </TokenGrid>
    </>
  );
}
