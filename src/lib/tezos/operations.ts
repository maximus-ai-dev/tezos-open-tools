"use client";

import type { WalletParamsWithKind } from "@taquito/taquito";
import { getTezos } from "./wallet";

export interface Fa2Transfer {
  fa: string;
  tokenId: string;
  to: string;
  amount: number;
}

interface Fa2TransferTx {
  to_: string;
  token_id: number;
  amount: number;
}

// Group transfers by FA contract and build per-contract `transfer` parameters
// using Taquito's high-level methodsObject API.
export async function buildFa2BatchTransfer(
  sender: string,
  transfers: Fa2Transfer[],
): Promise<WalletParamsWithKind[]> {
  const byContract = new Map<string, Fa2TransferTx[]>();
  for (const t of transfers) {
    const txs = byContract.get(t.fa) ?? [];
    txs.push({
      to_: t.to,
      token_id: Number(t.tokenId),
      amount: t.amount,
    });
    byContract.set(t.fa, txs);
  }

  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];
  for (const [fa, txs] of byContract) {
    const contract = await tezos.wallet.at(fa);
    const params = contract.methodsObject
      .transfer([{ from_: sender, txs }])
      .toTransferParams();
    ops.push({
      kind: "transaction" as const,
      ...params,
    } as WalletParamsWithKind);
  }
  return ops;
}

export interface Fa12Transfer {
  fa: string;
  to: string;
  amount: string; // smallest units; bigint-safe as a string
}

// FA1.2 (single-token contracts: USDC, kUSD, etc.) use a different `transfer` shape:
//   transfer(from :address, to :address, value :nat)
// vs FA2's batched `transfer([{from_, txs:[{to_, token_id, amount}]}])`.
// One op per (contract, transfer) — these don't batch within a single contract call.
export async function buildFa12BatchTransfer(
  sender: string,
  transfers: Fa12Transfer[],
): Promise<WalletParamsWithKind[]> {
  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];
  for (const t of transfers) {
    const contract = await tezos.wallet.at(t.fa);
    const params = contract.methodsObject
      .transfer({ from: sender, to: t.to, value: t.amount })
      .toTransferParams();
    ops.push({
      kind: "transaction" as const,
      ...params,
    } as WalletParamsWithKind);
  }
  return ops;
}

export interface SendResult {
  opHash: string;
}

export async function sendBatch(ops: WalletParamsWithKind[]): Promise<SendResult> {
  if (ops.length === 0) throw new Error("No operations to send");
  const tezos = getTezos();
  const op = await tezos.wallet.batch(ops).send();
  return { opHash: op.opHash };
}

// ──────────────────────────────────────────────────────────────────────────────
// Bulk revoke FA2 operator approvals (for /operators).
//
// Each grant is identified by (fa, owner=sender, operator, tokenId). We
// build update_operators(remove) calls grouped per FA contract so the wallet
// only sees one signing prompt per contract.

export interface RevocableOperatorGrant {
  fa: string;
  tokenId: string;
  operatorAddress: string;
}

export async function buildRevokeOperatorsBatch(
  ownerAddress: string,
  grants: RevocableOperatorGrant[],
): Promise<WalletParamsWithKind[]> {
  if (grants.length === 0) return [];
  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];

  // Group by FA contract — one update_operators per contract is enough.
  const byFa = new Map<string, RevocableOperatorGrant[]>();
  for (const g of grants) {
    const arr = byFa.get(g.fa) ?? [];
    arr.push(g);
    byFa.set(g.fa, arr);
  }

  for (const [fa, items] of byFa) {
    const faContract = await tezos.wallet.at(fa);
    const removes = items.map((g) => ({
      remove_operator: {
        owner: ownerAddress,
        operator: g.operatorAddress,
        token_id: Number(g.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(removes).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }
  return ops;
}

// ──────────────────────────────────────────────────────────────────────────────
// Marketplace listing cancellation
//
// Most objkt marketplaces use `retract_ask(nat)`; HEN/Teia use `cancel_swap(nat)`.

export interface CancellableListing {
  marketplaceContract: string;
  bigmapKey: number;
}

const CANCEL_BY_MARKETPLACE: Record<string, string> = {
  // objkt — fixed pricing handlers and modern marketplaces use retract_ask
  KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq: "retract_ask",
  KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC: "retract_ask",
  KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4: "retract_ask",
  KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY: "retract_ask",
  KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X: "retract_ask",
  KT1NiZkkW82wsTKP95x8FefdiseDyU9vX66W: "retract_ask",
  KT1KzmnX6Ffip7zVgGiCUV6ygqDU8hhGsMAy: "retract_ask",
  // HEN v2, Teia
  KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn: "cancel_swap",
  KT1PHubm9HtyQEJ4BBpMTVomq6mhbfNZ9z5w: "cancel_swap",
};

export function isCancellable(marketplaceContract: string): boolean {
  return marketplaceContract in CANCEL_BY_MARKETPLACE;
}

// Marketplaces that accept incoming offers via `fulfill_offer(offer_id)`.
const ACCEPT_VIA_FULFILL_OFFER: ReadonlySet<string> = new Set([
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq", // objkt v1
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC", // objkt v4
  "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4", // objkt v6
  "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY", // objkt v6.1
  "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X", // objkt v6.2
  "KT1NiZkkW82wsTKP95x8FefdiseDyU9vX66W", // objkt fp handler
  "KT1KzmnX6Ffip7zVgGiCUV6ygqDU8hhGsMAy", // objkt fp handler 2
]);

export function isAcceptableOffer(marketplaceContract: string): boolean {
  return ACCEPT_VIA_FULFILL_OFFER.has(marketplaceContract);
}

export interface AcceptableOffer {
  offerId: number;
  marketplaceContract: string;
  fa: string;
  tokenId: string;
}

/**
 * Accepting an offer requires the marketplace to be a temporary operator on the
 * token, then a fulfill_offer call. We add the operator, fulfill, and remove
 * the operator — so the user's permission state ends as it began.
 */
// ──────────────────────────────────────────────────────────────────────────────
// Buy / fulfill_ask (for inline Buy buttons on browse pages)
//
// objkt v6.2 fulfill_ask takes (ask_id, amount, proxy_for?, condition_extra?, referrers).
// We always include our REFERRAL_WALLET in `referrers` to claim the listing's
// referral bonus split — this is what `?ref=…` URL params do at the marketplace
// level, but on-chain when we originate the fulfill ourselves.

export interface BuyAsk {
  marketplaceContract: string;
  askId: number;
  /** how many editions to buy from this ask */
  amount: number;
  /** price-per-edition in mutez — used to compute the value we send */
  priceMutez: number;
}

const BUY_VIA_FULFILL_ASK: ReadonlySet<string> = new Set([
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq", // objkt v1
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC", // objkt v4
  "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4", // objkt v6
  "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY", // objkt v6.1
  "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X", // objkt v6.2
]);

export function isBuyable(marketplaceContract: string): boolean {
  return BUY_VIA_FULFILL_ASK.has(marketplaceContract);
}

// Bulk buy on objkt v6.2 via fulfill_ask_bulk — N listings in one signed op.
const OBJKT_V62_FOR_BULK = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";

export interface BulkBuyAsk {
  askId: number;
  amount: number;
  priceMutez: number;
}

export async function buildBulkBuy(
  buyerAddress: string,
  asks: BulkBuyAsk[],
  /** atomic=true means all-or-nothing; false allows partial fills if listings get sniped mid-tx. */
  atomic = false,
): Promise<WalletParamsWithKind[]> {
  if (asks.length === 0) return [];
  if (asks.length === 1) {
    return buildBuyBatch(buyerAddress, [
      {
        marketplaceContract: OBJKT_V62_FOR_BULK,
        askId: asks[0].askId,
        amount: asks[0].amount,
        priceMutez: asks[0].priceMutez,
      },
    ]);
  }
  const tezos = getTezos();
  const { REFERRAL_WALLET } = await import("@/lib/constants");
  const total = asks.reduce((s, a) => s + a.priceMutez * a.amount, 0);
  const asksMap: Record<string, { amount: number; condition_extra: null }> = {};
  for (const a of asks) {
    asksMap[String(a.askId)] = { amount: a.amount, condition_extra: null };
  }
  const mkt = await tezos.wallet.at(OBJKT_V62_FOR_BULK);
  const params = mkt.methodsObject
    .fulfill_ask_bulk({
      asks: asksMap,
      atomic,
      proxy_for: buyerAddress,
      referrers: { [REFERRAL_WALLET]: 10000 },
    })
    .toTransferParams({ amount: total, mutez: true });
  return [{ kind: "transaction" as const, ...params } as WalletParamsWithKind];
}

export async function buildBuyBatch(
  buyerAddress: string,
  buys: BuyAsk[],
): Promise<WalletParamsWithKind[]> {
  if (buys.length === 0) return [];
  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];
  const { REFERRAL_WALLET } = await import("@/lib/constants");
  for (const b of buys) {
    if (!isBuyable(b.marketplaceContract)) {
      throw new Error(
        `Buy not supported for marketplace ${b.marketplaceContract} — use the marketplace's UI directly.`,
      );
    }
    const mkt = await tezos.wallet.at(b.marketplaceContract);
    const params = mkt.methodsObject
      .fulfill_ask({
        ask_id: b.askId,
        amount: b.amount,
        proxy_for: buyerAddress,
        condition_extra: null,
        referrers: { [REFERRAL_WALLET]: 10000 },
      })
      .toTransferParams({ amount: b.priceMutez * b.amount, mutez: true });
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }
  return ops;
}

// ──────────────────────────────────────────────────────────────────────────────
// Batch listing creation (for /swap/batch and /swap/reswap)
//
// Targets objkt marketplace v6.2 — the current default `ask` entrypoint.
// Each listing creates one (token, amount, editions, currency=tez) ask record.
// The marketplace is granted FA2 operator rights on the listed token before
// the ask call, so subsequent buyer purchases can move the token. We do NOT
// remove the operator afterward — the marketplace needs to keep it to settle
// future buys. (If you cancel all listings on a token, you can revoke
// manually via Temple/Kukai.)

const OBJKT_V6_2_MARKETPLACE = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";

export interface NewListing {
  fa: string;
  tokenId: string;
  priceMutez: number;
  editions: number;
  /** seconds since epoch; if omitted, no expiry */
  expiryTimestamp?: number;
}

export async function buildBatchListings(
  sellerAddress: string,
  listings: NewListing[],
): Promise<WalletParamsWithKind[]> {
  if (listings.length === 0) return [];
  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];

  // Group by FA contract so we can batch operator approvals per contract.
  const byFa = new Map<string, NewListing[]>();
  for (const l of listings) {
    const arr = byFa.get(l.fa) ?? [];
    arr.push(l);
    byFa.set(l.fa, arr);
  }

  // Step 1: grant marketplace operator rights on every (fa, token_id) being listed.
  for (const [fa, items] of byFa) {
    const faContract = await tezos.wallet.at(fa);
    const adds = items.map((l) => ({
      add_operator: {
        owner: sellerAddress,
        operator: OBJKT_V6_2_MARKETPLACE,
        token_id: Number(l.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(adds).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }

  // Step 2: post one ask per listing.
  const marketplace = await tezos.wallet.at(OBJKT_V6_2_MARKETPLACE);
  for (const l of listings) {
    const askParams = {
      token: { address: l.fa, token_id: Number(l.tokenId) },
      currency: { tez: {} as Record<string, never> },
      amount: l.priceMutez,
      editions: l.editions,
      shares: { [sellerAddress]: 1000 },
      start_time: null,
      expiry_time:
        l.expiryTimestamp !== undefined
          ? new Date(l.expiryTimestamp * 1000).toISOString()
          : null,
      referral_bonus: 500,
      condition: null,
    };
    const params = marketplace.methodsObject.ask(askParams).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }

  return ops;
}

export async function buildAcceptOffersBatch(
  sellerAddress: string,
  offers: AcceptableOffer[],
): Promise<WalletParamsWithKind[]> {
  if (offers.length === 0) return [];
  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];

  // Group operator updates by FA contract — one update_operators per fa is enough
  // even when accepting many offers on tokens within that fa.
  const opsByFa = new Map<string, AcceptableOffer[]>();
  for (const o of offers) {
    const list = opsByFa.get(o.fa) ?? [];
    list.push(o);
    opsByFa.set(o.fa, list);
  }

  // Phase 1: add operator approvals for each (fa, marketplace, token_id) tuple.
  for (const [fa, list] of opsByFa) {
    const faContract = await tezos.wallet.at(fa);
    const adds = list.map((o) => ({
      add_operator: {
        owner: sellerAddress,
        operator: o.marketplaceContract,
        token_id: Number(o.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(adds).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }

  // Phase 2: fulfill each offer.
  for (const o of offers) {
    const mkt = await tezos.wallet.at(o.marketplaceContract);
    const params = mkt.methodsObject.fulfill_offer(o.offerId).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }

  // Phase 3: remove operator approvals so the user's permission state is unchanged.
  for (const [fa, list] of opsByFa) {
    const faContract = await tezos.wallet.at(fa);
    const removes = list.map((o) => ({
      remove_operator: {
        owner: sellerAddress,
        operator: o.marketplaceContract,
        token_id: Number(o.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(removes).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }

  return ops;
}

export async function buildCancelBatch(
  listings: CancellableListing[],
): Promise<WalletParamsWithKind[]> {
  const tezos = getTezos();
  const ops: WalletParamsWithKind[] = [];
  for (const l of listings) {
    const entrypoint = CANCEL_BY_MARKETPLACE[l.marketplaceContract];
    if (!entrypoint) {
      throw new Error(
        `Cancellation not supported for marketplace ${l.marketplaceContract}`,
      );
    }
    const contract = await tezos.wallet.at(l.marketplaceContract);
    const params = contract.methodsObject[entrypoint](l.bigmapKey).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }
  return ops;
}
