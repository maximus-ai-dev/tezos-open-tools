import type { OfferActive } from "@/lib/objkt";
import {
  MARKETPLACE_NAMES,
  objktTokenLink,
  objktProfileLink,
  objktCollectionLink,
} from "@/lib/constants";
import { formatDate, formatTez, ipfsToHttp, shortAddress } from "@/lib/utils";
import { WatchButton } from "@/components/common/WatchButton";

interface OfferTableProps {
  offers: OfferActive[];
  mode: "received" | "made";
}

export function OfferTable({ offers, mode }: OfferTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
          <tr>
            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Price</th>
            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
              {mode === "received" ? "Buyer" : "Seller"}
            </th>
            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Made</th>
            <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Expires</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => {
            const isCollectionOffer = !!o.collection_offer && !o.token;
            const counterparty = mode === "received" ? o.buyer_address : o.seller_address;
            const counterpartyAlias = mode === "received" ? o.buyer?.alias ?? null : null;
            const tokenName =
              o.token?.name ??
              (isCollectionOffer ? o.fa?.name ?? "(collection)" : `#${o.token?.token_id ?? "?"}`);
            const tokenHref = isCollectionOffer
              ? o.fa
                ? objktCollectionLink(o.fa.contract)
                : "#"
              : o.token
                ? objktTokenLink(o.token.fa_contract, o.token.token_id)
                : "#";
            const thumb = o.token
              ? ipfsToHttp(o.token.thumbnail_uri) ?? ipfsToHttp(o.token.display_uri)
              : null;
            return (
              <tr
                key={o.id}
                className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-2">
                  <a
                    href={tokenHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </span>
                    <span className="truncate max-w-xs text-zinc-900 dark:text-zinc-100">
                      {tokenName}
                      {isCollectionOffer && (
                        <span className="ml-1 text-xs text-zinc-500">(collection)</span>
                      )}
                    </span>
                  </a>
                </td>
                <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {formatTez(o.price_xtz ?? o.price)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {counterparty ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={objktProfileLink(counterparty)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        title={counterparty}
                      >
                        {counterpartyAlias ?? shortAddress(counterparty)}
                      </a>
                      <WatchButton
                        address={counterparty}
                        label={counterpartyAlias ?? undefined}
                      />
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {o.marketplace_contract
                    ? MARKETPLACE_NAMES[o.marketplace_contract] ?? "marketplace"
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500 whitespace-nowrap">
                  {formatDate(o.timestamp)}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500 whitespace-nowrap">
                  {o.expiry ? formatDate(o.expiry) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
