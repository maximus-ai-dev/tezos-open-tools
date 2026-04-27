import type { ReactNode } from "react";
import { objktTokenLink, objktProfileLink } from "@/lib/constants";
import { formatTez, ipfsToHttp, shortAddress } from "@/lib/utils";

export interface TokenCardData {
  fa: string;
  tokenId: string;
  name: string | null;
  thumbnailUri: string | null;
  displayUri?: string | null;
  artistAddress?: string | null;
  artistAlias?: string | null;
  supply?: number | null;
}

interface TokenCardProps {
  token: TokenCardData;
  priceMutez?: number | null;
  badge?: ReactNode;
  marketplaceLabel?: string | null;
  /** Optional footer slot — used to drop in a BuyButton or other action. */
  footer?: ReactNode;
}

export function TokenCard({ token, priceMutez, badge, marketplaceLabel, footer }: TokenCardProps) {
  const thumb = ipfsToHttp(token.thumbnailUri) ?? ipfsToHttp(token.displayUri ?? null);
  const title = token.name ?? `#${token.tokenId}`;
  return (
    <article className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
      <a
        href={objktTokenLink(token.fa, token.tokenId)}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square bg-zinc-100 dark:bg-zinc-900 relative"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
            no preview
          </div>
        )}
        {badge && (
          <span className="absolute top-2 left-2 rounded bg-black/70 text-white text-[11px] px-1.5 py-0.5 font-medium">
            {badge}
          </span>
        )}
      </a>
      <div className="p-3">
        <a
          href={objktTokenLink(token.fa, token.tokenId)}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium truncate text-zinc-900 dark:text-zinc-100 hover:underline"
          title={title}
        >
          {title}
        </a>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
          {token.artistAddress ? (
            <a
              href={objktProfileLink(token.artistAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-zinc-900 dark:hover:text-zinc-100"
              title={token.artistAddress}
            >
              {token.artistAlias ?? shortAddress(token.artistAddress)}
            </a>
          ) : (
            <span />
          )}
          {priceMutez !== undefined && priceMutez !== null ? (
            <span
              className="text-zinc-900 dark:text-zinc-100 font-medium whitespace-nowrap"
              title={marketplaceLabel ?? undefined}
            >
              {formatTez(priceMutez)}
            </span>
          ) : null}
        </div>
        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </article>
  );
}
