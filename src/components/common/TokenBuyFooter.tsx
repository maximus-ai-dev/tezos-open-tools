import { BuyButton } from "@/components/common/BuyButton";
import { objktTokenLink } from "@/lib/constants";

interface TokenBuyFooterProps {
  token: {
    fa_contract: string;
    token_id: string;
    name: string | null;
    listings_active: Array<{
      bigmap_key: number | null;
      price: number;
      amount_left: number;
      marketplace_contract: string;
    }>;
    open_edition_active: {
      price: number;
      start_time: string | null;
      end_time: string | null;
    } | null;
  };
}

function isOpenEditionActive(oe: { start_time: string | null; end_time: string | null }): boolean {
  const now = Date.now();
  if (oe.start_time && Date.parse(oe.start_time) > now) return false;
  if (oe.end_time && Date.parse(oe.end_time) < now) return false;
  return true;
}

/** Picks the right buy affordance for a token:
 *  - regular XTZ listing → inline BuyButton
 *  - active open edition → "Buy on objkt ↗" redirect (sale_id isn't exposed
 *    by objkt's GraphQL so we can't inline-buy these yet)
 *  - nothing actionable → renders nothing */
export function TokenBuyFooter({ token }: TokenBuyFooterProps) {
  const listing = token.listings_active[0];
  if (listing && listing.bigmap_key !== null && listing.bigmap_key !== undefined) {
    return (
      <BuyButton
        marketplaceContract={listing.marketplace_contract}
        askId={listing.bigmap_key}
        priceMutez={listing.price}
        amountAvailable={listing.amount_left}
        tokenName={token.name}
        fa={token.fa_contract}
        tokenId={token.token_id}
      />
    );
  }
  const oe = token.open_edition_active;
  if (oe && isOpenEditionActive(oe)) {
    return (
      <a
        href={objktTokenLink(token.fa_contract, token.token_id)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Open-edition drops mint through a different objkt contract — opens objkt.com in a new tab."
        className="text-[11px] px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium text-emerald-800 dark:text-emerald-300"
      >
        Open edition · Buy on objkt ↗
      </a>
    );
  }
  return null;
}
