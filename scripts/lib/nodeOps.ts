// Node-side mirrors of src/lib/tezos/operations.ts — same logic, but uses
// `tezos.contract.at` (the Node/server contract abstraction) and returns
// `ParamsWithKind[]` for `tezos.contract.batch` instead of the wallet variants.
//
// Keep these in sync with src/lib/tezos/operations.ts when changing entrypoint
// dispatch tables or operation shapes.

import type { ParamsWithKind, TezosToolkit } from "@taquito/taquito";

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

export async function buildFa2BatchTransfer(
  tezos: TezosToolkit,
  sender: string,
  transfers: Fa2Transfer[],
): Promise<ParamsWithKind[]> {
  const byContract = new Map<string, Fa2TransferTx[]>();
  for (const t of transfers) {
    const txs = byContract.get(t.fa) ?? [];
    txs.push({ to_: t.to, token_id: Number(t.tokenId), amount: t.amount });
    byContract.set(t.fa, txs);
  }
  const ops: ParamsWithKind[] = [];
  for (const [fa, txs] of byContract) {
    const contract = await tezos.contract.at(fa);
    const params = contract.methodsObject
      .transfer([{ from_: sender, txs }])
      .toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }
  return ops;
}

const CANCEL_BY_MARKETPLACE: Record<string, string> = {
  KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq: "retract_ask",
  KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC: "retract_ask",
  KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4: "retract_ask",
  KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY: "retract_ask",
  KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X: "retract_ask",
  KT1NiZkkW82wsTKP95x8FefdiseDyU9vX66W: "retract_ask",
  KT1KzmnX6Ffip7zVgGiCUV6ygqDU8hhGsMAy: "retract_ask",
  KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn: "cancel_swap",
  KT1PHubm9HtyQEJ4BBpMTVomq6mhbfNZ9z5w: "cancel_swap",
};

export interface CancellableListing {
  marketplaceContract: string;
  bigmapKey: number;
}

export function isCancellable(marketplaceContract: string): boolean {
  return marketplaceContract in CANCEL_BY_MARKETPLACE;
}

export async function buildCancelBatch(
  tezos: TezosToolkit,
  listings: CancellableListing[],
): Promise<ParamsWithKind[]> {
  const ops: ParamsWithKind[] = [];
  for (const l of listings) {
    const ep = CANCEL_BY_MARKETPLACE[l.marketplaceContract];
    if (!ep) throw new Error(`Cancel not supported on ${l.marketplaceContract}`);
    const contract = await tezos.contract.at(l.marketplaceContract);
    const params = contract.methodsObject[ep](l.bigmapKey).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }
  return ops;
}

const ACCEPT_VIA_FULFILL_OFFER: ReadonlySet<string> = new Set([
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq",
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4",
  "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY",
  "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X",
  "KT1NiZkkW82wsTKP95x8FefdiseDyU9vX66W",
  "KT1KzmnX6Ffip7zVgGiCUV6ygqDU8hhGsMAy",
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

// ──────────────────────────────────────────────────────────────────────────────
// Buy / fulfill_ask (mirror of operations.ts buildBuyBatch)

export interface BuyAsk {
  marketplaceContract: string;
  askId: number;
  amount: number;
  priceMutez: number;
}

const BUY_VIA_FULFILL_ASK: ReadonlySet<string> = new Set([
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq",
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4",
  "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY",
  "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X",
]);

export function isBuyable(marketplaceContract: string): boolean {
  return BUY_VIA_FULFILL_ASK.has(marketplaceContract);
}

export async function buildBuyBatch(
  tezos: TezosToolkit,
  buyerAddress: string,
  buys: BuyAsk[],
  referralWallet: string,
): Promise<ParamsWithKind[]> {
  if (buys.length === 0) return [];
  const ops: ParamsWithKind[] = [];
  for (const b of buys) {
    if (!isBuyable(b.marketplaceContract)) {
      throw new Error(`Buy not supported for marketplace ${b.marketplaceContract}`);
    }
    const mkt = await tezos.contract.at(b.marketplaceContract);
    const params = mkt.methodsObject
      .fulfill_ask({
        ask_id: b.askId,
        amount: b.amount,
        proxy_for: buyerAddress,
        condition_extra: null,
        referrers: { [referralWallet]: 10000 },
      })
      .toTransferParams({ amount: b.priceMutez * b.amount, mutez: true });
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }
  return ops;
}

// ──────────────────────────────────────────────────────────────────────────────
// Batch listing creation (mirror of operations.ts buildBatchListings).

const OBJKT_V6_2_MARKETPLACE = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";

export interface NewListing {
  fa: string;
  tokenId: string;
  priceMutez: number;
  editions: number;
  expiryTimestamp?: number;
}

export async function buildBatchListings(
  tezos: TezosToolkit,
  sellerAddress: string,
  listings: NewListing[],
): Promise<ParamsWithKind[]> {
  if (listings.length === 0) return [];
  const ops: ParamsWithKind[] = [];

  const byFa = new Map<string, NewListing[]>();
  for (const l of listings) {
    const arr = byFa.get(l.fa) ?? [];
    arr.push(l);
    byFa.set(l.fa, arr);
  }

  for (const [fa, items] of byFa) {
    const faContract = await tezos.contract.at(fa);
    const adds = items.map((l) => ({
      add_operator: {
        owner: sellerAddress,
        operator: OBJKT_V6_2_MARKETPLACE,
        token_id: Number(l.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(adds).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }

  const marketplace = await tezos.contract.at(OBJKT_V6_2_MARKETPLACE);
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
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }

  return ops;
}

export async function buildAcceptOffersBatch(
  tezos: TezosToolkit,
  sellerAddress: string,
  offers: AcceptableOffer[],
): Promise<ParamsWithKind[]> {
  if (offers.length === 0) return [];
  const ops: ParamsWithKind[] = [];

  const opsByFa = new Map<string, AcceptableOffer[]>();
  for (const o of offers) {
    const list = opsByFa.get(o.fa) ?? [];
    list.push(o);
    opsByFa.set(o.fa, list);
  }

  for (const [fa, list] of opsByFa) {
    const faContract = await tezos.contract.at(fa);
    const adds = list.map((o) => ({
      add_operator: {
        owner: sellerAddress,
        operator: o.marketplaceContract,
        token_id: Number(o.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(adds).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }

  for (const o of offers) {
    const mkt = await tezos.contract.at(o.marketplaceContract);
    const params = mkt.methodsObject.fulfill_offer(o.offerId).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }

  for (const [fa, list] of opsByFa) {
    const faContract = await tezos.contract.at(fa);
    const removes = list.map((o) => ({
      remove_operator: {
        owner: sellerAddress,
        operator: o.marketplaceContract,
        token_id: Number(o.tokenId),
      },
    }));
    const params = faContract.methodsObject.update_operators(removes).toTransferParams();
    ops.push({ kind: "transaction" as const, ...params } as ParamsWithKind);
  }

  return ops;
}
