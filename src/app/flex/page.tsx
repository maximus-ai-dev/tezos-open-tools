import { getHoldings } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { TokenGrid } from "@/components/common/TokenGrid";
import { TokenCard } from "@/components/common/TokenCard";
import { PinButton } from "@/components/common/PinButton";
import { TokenBuyFooter } from "@/components/common/TokenBuyFooter";
import { decodePinsParam } from "@/lib/pinFormat";
import { isTezosAddress, shortAddress } from "@/lib/utils";
import type { HoldingsResult } from "@/lib/objkt";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string; limit?: string; screenshot?: string; pins?: string }>;
}

// Reorder a holder's held tokens so any tokens in the pinSet appear first,
// in the order they were pinned. Held tokens not in the pinSet keep their
// original (last-incremented-at-desc) order behind them.
function applyPins(
  result: HoldingsResult,
  pins: Array<{ fa: string; tokenId: string }>,
): HoldingsResult {
  if (pins.length === 0) return result;
  const pinKey = (fa: string, id: string) => `${fa}:${id}`;
  const pinned = new Map<string, number>();
  pins.forEach((p, i) => pinned.set(pinKey(p.fa, p.tokenId), i));
  const front: typeof result.held = [];
  const rest: typeof result.held = [];
  for (const h of result.held) {
    const k = pinKey(h.token.fa_contract, h.token.token_id);
    if (pinned.has(k)) front.push(h);
    else rest.push(h);
  }
  front.sort((a, b) => {
    const ai = pinned.get(pinKey(a.token.fa_contract, a.token.token_id)) ?? 0;
    const bi = pinned.get(pinKey(b.token.fa_contract, b.token.token_id)) ?? 0;
    return ai - bi;
  });
  return { ...result, held: [...front, ...rest] };
}

export default async function FlexPage({ searchParams }: PageProps) {
  const { address, limit, screenshot, pins: pinsParam } = await searchParams;
  const valid = address && isTezosAddress(address);
  const cap = Math.min(Math.max(Number(limit) || 60, 12), 240);
  const isScreenshot = screenshot === "1";
  const pins = pinsParam ? decodePinsParam(pinsParam) : [];

  if (isScreenshot && valid) {
    return <ScreenshotView address={address!} limit={cap} pins={pins} />;
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
          <Flex address={address!} limit={cap} pins={pins} />
          <p className="mt-6 text-xs text-zinc-500">
            <a
              href={`/flex?address=${address}&limit=${cap}${pinsParam ? `&pins=${pinsParam}` : ""}&screenshot=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open screenshot view →
            </a>{" "}
            (chrome hidden, full bleed — capture with your OS&apos;s screenshot tool)
            {pins.length === 0 && (
              <>
                {" · "}
                <a
                  href="/pin"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Pin tokens to feature them →
                </a>
              </>
            )}
          </p>
        </>
      )}
    </PageShell>
  );
}

async function Flex({
  address,
  limit,
  pins,
}: {
  address: string;
  limit: number;
  pins: Array<{ fa: string; tokenId: string }>;
}) {
  const raw = await getHoldings(address, { limit }).catch(() => null);
  if (!raw || raw.held.length === 0) {
    return <p className="mt-6 text-sm text-zinc-500">No tokens found in this wallet.</p>;
  }
  const result = applyPins(raw, pins);
  const pinKey = (fa: string, id: string) => `${fa}:${id}`;
  const pinSet = new Set(pins.map((p) => pinKey(p.fa, p.tokenId)));
  return (
    <>
      <p className="mt-6 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {result.alias ?? shortAddress(address)}
        </span>{" "}
        — {result.held.length} pieces shown
        {pins.length > 0 && (
          <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
            · {pins.length} pinned (shown first)
          </span>
        )}
      </p>
      <TokenGrid>
        {result.held.map((h) => {
          const creator = h.token.creators[0]?.holder;
          const isPinnedHere = pinSet.has(pinKey(h.token.fa_contract, h.token.token_id));
          const badge = isPinnedHere
            ? `📌${h.quantity > 1 ? ` ×${h.quantity}` : ""}`
            : h.quantity > 1
              ? `×${h.quantity}`
              : null;
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
              badge={badge}
              footer={
                <div className="flex items-center gap-2 flex-wrap">
                  <TokenBuyFooter token={h.token} />
                  <PinButton fa={h.token.fa_contract} tokenId={h.token.token_id} />
                </div>
              }
            />
          );
        })}
      </TokenGrid>
    </>
  );
}

async function ScreenshotView({
  address,
  limit,
  pins,
}: {
  address: string;
  limit: number;
  pins: Array<{ fa: string; tokenId: string }>;
}) {
  const raw = await getHoldings(address, { limit }).catch(() => null);
  const result = raw ? applyPins(raw, pins) : null;
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
