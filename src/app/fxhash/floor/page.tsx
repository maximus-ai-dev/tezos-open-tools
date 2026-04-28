import { getFaFloor, getFaInfo } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { BuyButton } from "@/components/common/BuyButton";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { formatTez, parseContractInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ fa?: string }>;
}

export default async function FxhashFloorPage({ searchParams }: PageProps) {
  const { fa: faParam } = await searchParams;
  const fa = faParam ? parseContractInput(faParam) : null;
  return (
    <PageShell
      title="fxhash Floor"
      description="Cheapest active listings in a collection — useful for sweeping the floor."
    >
      <WalletInputForm
        action="/fxhash/floor"
        initial={faParam ?? ""}
        paramName="fa"
        placeholder="KT1... contract address or objkt.com collection URL"
      />
      {faParam && !fa && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t find a contract address in that input.
        </p>
      )}
      {fa && <Floor fa={fa} />}
    </PageShell>
  );
}

async function Floor({ fa }: { fa: string }) {
  const [info, listings] = await Promise.all([
    getFaInfo(fa).catch(() => null),
    getFaFloor(fa, { limit: 60 }).catch(() => []),
  ]);
  if (listings.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No active listings for this contract.</p>;
  }
  const cheapest = listings[0]?.price ?? 0;
  return (
    <>
      <div className="mt-6 mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {info?.name && (
          <span>
            Collection:{" "}
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{info.name}</span>
          </span>
        )}
        <span>
          Active listings (shown):{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{listings.length}</span>
        </span>
        <span>
          Cheapest:{" "}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{formatTez(cheapest)}</span>
        </span>
      </div>
      <TokenGrid>
        {listings.map((l) => {
          const tok = l.token;
          if (!tok || l.bigmap_key === null) return null;
          const creator = tok.creators?.[0]?.holder;
          return (
            <TokenCard
              key={l.id}
              token={{
                fa: tok.fa_contract,
                tokenId: tok.token_id,
                name: tok.name,
                thumbnailUri: tok.thumbnail_uri,
                displayUri: tok.display_uri,
                artistAddress: creator?.address ?? null,
                artistAlias: creator?.alias ?? null,
              }}
              priceMutez={l.price}
              marketplaceLabel={MARKETPLACE_NAMES[l.marketplace_contract] ?? "marketplace"}
              footer={
                <BuyButton
                  marketplaceContract={l.marketplace_contract}
                  askId={l.bigmap_key}
                  priceMutez={l.price}
                  amountAvailable={l.amount_left}
                  tokenName={tok.name}
                />
              }
            />
          );
        })}
      </TokenGrid>
    </>
  );
}
