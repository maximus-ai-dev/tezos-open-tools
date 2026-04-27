import { getCreatorBurnedTokens } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function BurnedPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const valid = address && isTezosAddress(address);
  return (
    <PageShell
      title="Burns"
      description="Tokens you minted that have been entirely burned (current supply = 0)."
    >
      <WalletInputForm
        action="/burned"
        initial={address ?? ""}
        placeholder="tz1... artist wallet address"
      />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && <BurnedList address={address!} />}
    </PageShell>
  );
}

async function BurnedList({ address }: { address: string }) {
  const tokens = await getCreatorBurnedTokens(address, { limit: 200 }).catch(() => []);
  if (tokens.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No fully burned tokens for this creator.</p>;
  }
  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{tokens.length}</span>{" "}
        burned tokens (newest first).
      </p>
      <TokenGrid>
        {tokens.map((t) => (
          <TokenCard
            key={`${t.fa_contract}:${t.token_id}`}
            token={{
              fa: t.fa_contract,
              tokenId: t.token_id,
              name: t.name,
              thumbnailUri: t.thumbnail_uri,
              displayUri: t.display_uri,
              artistAddress: address,
              supply: t.supply,
            }}
            badge="🔥 burned"
          />
        ))}
      </TokenGrid>
    </>
  );
}
