import { getHoldings } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { isTezosAddress, shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string; limit?: string; screenshot?: string }>;
}

export default async function FlexPage({ searchParams }: PageProps) {
  const { address, limit, screenshot } = await searchParams;
  const valid = address && isTezosAddress(address);
  const cap = Math.min(Math.max(Number(limit) || 60, 12), 240);
  const isScreenshot = screenshot === "1";

  if (isScreenshot && valid) {
    return <ScreenshotView address={address!} limit={cap} />;
  }

  return (
    <PageShell
      title="Flex"
      description="Show off a wallet's collection in a clean grid — no prices, no chrome, just the art."
    >
      <WalletInputForm action="/flex" initial={address ?? ""} />
      {address && !valid && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
      {valid && (
        <>
          <Flex address={address!} limit={cap} />
          <p className="mt-6 text-xs text-zinc-500">
            <a
              href={`/flex?address=${address}&limit=${cap}&screenshot=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open screenshot view →
            </a>{" "}
            (chrome hidden, full bleed — capture with your OS&apos;s screenshot tool)
          </p>
        </>
      )}
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

async function ScreenshotView({ address, limit }: { address: string; limit: number }) {
  const result = await getHoldings(address, { limit }).catch(() => null);
  return (
    <div className="bg-white dark:bg-black min-h-screen">
      {/* Hide every layout-chrome element so this view is pure art for screenshots. */}
      <style
        dangerouslySetInnerHTML={{
          __html: '[data-chrome] { display: none !important; }',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-lg font-medium mb-4 text-zinc-900 dark:text-zinc-100">
          {result?.alias ?? shortAddress(address)}
          {result && (
            <span className="ml-2 text-sm text-zinc-500 font-normal">
              {result.held.length} pieces
            </span>
          )}
        </h1>
        {result && result.held.length > 0 && (
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
                  }}
                  badge={h.quantity > 1 ? `×${h.quantity}` : null}
                />
              );
            })}
          </TokenGrid>
        )}
      </div>
    </div>
  );
}
