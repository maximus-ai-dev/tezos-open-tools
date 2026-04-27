// Read-only state helpers for the test harness — fetch holdings, listings,
// and offers via TzKT + Objkt to display before/after each test.

import { getHoldings, getOffersReceived, getSellerListings } from "../../src/lib/objkt/queries";
import { tzktFetch } from "../../src/lib/tzkt/client";

export interface BalanceRow {
  account: string;
  balance: string;
  token: { contract: { address: string }; tokenId: string };
}

export async function getTokenBalance(
  account: string,
  fa: string,
  tokenId: string,
): Promise<number> {
  const rows = await tzktFetch<BalanceRow[]>("/tokens/balances", {
    account,
    "token.contract": fa,
    "token.tokenId": tokenId,
    select: "balance,token,account",
  }).catch(() => []);
  if (rows.length === 0) return 0;
  return Number(rows[0].balance ?? 0);
}

export interface WalletSnapshot {
  address: string;
  tokenBalance: number;
  activeListings: number;
  incomingOffers: number;
}

export async function snapshotWallet(
  address: string,
  fa: string,
  tokenId: string,
): Promise<WalletSnapshot> {
  const [tokenBalance, listings, offers] = await Promise.all([
    getTokenBalance(address, fa, tokenId),
    getSellerListings(address, { limit: 100 }).catch(() => []),
    getOffersReceived(address, { limit: 100 }).catch(() => []),
  ]);
  const matchingListings = listings.filter(
    (l) => l.token?.fa_contract === fa && l.token?.token_id === tokenId,
  );
  const matchingOffers = offers.filter(
    (o) => o.token?.fa_contract === fa && o.token?.token_id === tokenId,
  );
  return {
    address,
    tokenBalance,
    activeListings: matchingListings.length,
    incomingOffers: matchingOffers.length,
  };
}

export { getSellerListings, getOffersReceived, getHoldings };
