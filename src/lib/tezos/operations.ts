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
/** Thrown when one or more contracts/tokens couldn't be prepared for transfer.
 *  `failedContracts` are FA addresses where every selected token is unusable;
 *  `failedTokens` are individual (fa, tokenId) pairs (used for malformed IDs). */
export class BatchBuildError extends Error {
  failedContracts: string[];
  failedTokens: Array<{ fa: string; tokenId: string }>;
  constructor(
    failedContracts: string[],
    failedTokens: Array<{ fa: string; tokenId: string }> = [],
  ) {
    const parts: string[] = [];
    if (failedContracts.length > 0) parts.push(`${failedContracts.length} contract(s)`);
    if (failedTokens.length > 0) parts.push(`${failedTokens.length} malformed token(s)`);
    super(`Couldn't prepare ${parts.join(" and ")}`);
    this.failedContracts = failedContracts;
    this.failedTokens = failedTokens;
  }
}

/** True if `id` is a string of digits representing a non-negative integer. */
function isValidTokenId(id: unknown): boolean {
  return typeof id === "string" && /^\d+$/.test(id);
}

// Split a single contract's transfer call into chunks of N txs each. Tezos
// caps gas at ~1.04M per operation; a `transfer` entrypoint loops over every
// tx, so heavy contracts with many txs in one call hit gas_limit_too_high.
// 5 is conservative even for expensive on-transfer hooks.
const TXS_PER_TRANSFER_CALL = 5;

// If a single op's gas estimate from the diagnostic exceeds this, we treat
// the contract as too heavy to sweep. The protocol cap is ~1.04M, and the
// signing-time gas usage can run notably higher than the standalone estimate
// (cross-op state effects + wallet's own safety margin), so we leave a wide
// gap.
const MAX_PER_OP_GAS = 600_000;

export async function buildFa2BatchTransfer(
  sender: string,
  transfers: Fa2Transfer[],
): Promise<WalletParamsWithKind[]> {
  const byContract = new Map<string, Fa2TransferTx[]>();
  const failedTokens: Array<{ fa: string; tokenId: string }> = [];
  for (const t of transfers) {
    // Pre-validate inputs — malformed tokenIds slip through Taquito's
    // methodsObject and explode at RPC simulation as a generic "[0] Type
    // error" with no context. Catch them here instead.
    if (!isValidTokenId(t.tokenId) || !Number.isFinite(t.amount) || t.amount < 1) {
      failedTokens.push({ fa: t.fa, tokenId: String(t.tokenId) });
      continue;
    }
    const txs = byContract.get(t.fa) ?? [];
    txs.push({
      to_: t.to,
      token_id: Number(t.tokenId),
      amount: t.amount,
    });
    byContract.set(t.fa, txs);
  }

  // Fetch every contract abstraction in parallel — a sequential loop here is
  // the dominant cost when sweeping NFTs from 30+ collections. Use allSettled
  // so a single malformed scam token doesn't abort the whole batch. Param
  // construction can also throw synchronously on non-standard FA2 schemas, so
  // each per-contract step is wrapped in its own try/catch.
  const tezos = getTezos();
  const uniqueFas = [...byContract.keys()];
  const settled = await Promise.allSettled(uniqueFas.map((fa) => tezos.wallet.at(fa)));
  const failedContracts: string[] = [];
  const contractByFa = new Map<string, Awaited<ReturnType<typeof tezos.wallet.at>>>();
  settled.forEach((res, i) => {
    const fa = uniqueFas[i]!;
    if (res.status === "rejected") failedContracts.push(fa);
    else contractByFa.set(fa, res.value);
  });

  const ops: WalletParamsWithKind[] = [];
  for (const [fa, txs] of byContract) {
    const contract = contractByFa.get(fa);
    if (!contract) continue;
    // Split heavy contracts into multiple transfer calls so no single op
    // declares a gas_limit above hard_gas_limit_per_operation (~1.04M).
    let perContractFailed = false;
    for (let i = 0; i < txs.length; i += TXS_PER_TRANSFER_CALL) {
      const chunkTxs = txs.slice(i, i + TXS_PER_TRANSFER_CALL);
      try {
        const params = contract.methodsObject
          .transfer([{ from_: sender, txs: chunkTxs }])
          .toTransferParams();
        ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
      } catch {
        perContractFailed = true;
        break;
      }
    }
    if (perContractFailed && !failedContracts.includes(fa)) failedContracts.push(fa);
  }
  if (failedContracts.length > 0 || failedTokens.length > 0) {
    throw new BatchBuildError(failedContracts, failedTokens);
  }
  return ops;
}

/** Diagnoses an FA2 sweep selection by building per-contract transfer ops and
 *  running RPC simulation against each one — throttled to avoid flooding free
 *  RPC nodes — to surface contracts that would fail at signing time
 *  (operator-required, paused, soulbound, malformed schemas, etc.).
 *
 *  Concurrency is intentionally low. Each op gets up to 3 attempts with
 *  exponential backoff so 5xx rate-limit responses don't get treated as real
 *  contract failures. */
export interface OpWithGas {
  op: WalletParamsWithKind;
  gas: number;
  /** Source FA contract — used so failed batch validation can map back to a
   *  user-meaningful identifier ("Uncheck broken contracts"). */
  fa: string;
}

export async function diagnoseFa2Transfers(
  sender: string,
  transfers: Fa2Transfer[],
  onProgress?: (done: number, total: number) => void,
): Promise<{
  ops: OpWithGas[];
  failedContracts: string[];
  failedTokens: Array<{ fa: string; tokenId: string }>;
}> {
  // First pass: build per-contract ops, separating the obvious failures.
  const byContract = new Map<string, Fa2TransferTx[]>();
  const failedTokens: Array<{ fa: string; tokenId: string }> = [];
  for (const t of transfers) {
    if (!isValidTokenId(t.tokenId) || !Number.isFinite(t.amount) || t.amount < 1) {
      failedTokens.push({ fa: t.fa, tokenId: String(t.tokenId) });
      continue;
    }
    const txs = byContract.get(t.fa) ?? [];
    txs.push({ to_: t.to, token_id: Number(t.tokenId), amount: t.amount });
    byContract.set(t.fa, txs);
  }

  const tezos = getTezos();
  const uniqueFas = [...byContract.keys()];
  const settled = await Promise.allSettled(uniqueFas.map((fa) => tezos.wallet.at(fa)));
  const failedContracts: string[] = [];
  const contractByFa = new Map<string, Awaited<ReturnType<typeof tezos.wallet.at>>>();
  settled.forEach((res, i) => {
    const fa = uniqueFas[i]!;
    if (res.status === "rejected") failedContracts.push(fa);
    else contractByFa.set(fa, res.value);
  });

  // Split heavy contracts into per-15-tx transfer calls so each op stays
  // under hard_gas_limit_per_operation. Each chunk gets its own simulation.
  const taggedOps: Array<{ fa: string; op: WalletParamsWithKind }> = [];
  for (const [fa, txs] of byContract) {
    const contract = contractByFa.get(fa);
    if (!contract) continue;
    let buildFailed = false;
    for (let i = 0; i < txs.length; i += TXS_PER_TRANSFER_CALL) {
      const chunkTxs = txs.slice(i, i + TXS_PER_TRANSFER_CALL);
      try {
        const params = contract.methodsObject
          .transfer([{ from_: sender, txs: chunkTxs }])
          .toTransferParams();
        taggedOps.push({
          fa,
          op: { kind: "transaction" as const, ...params } as WalletParamsWithKind,
        });
      } catch {
        buildFailed = true;
        break;
      }
    }
    if (buildFailed && !failedContracts.includes(fa)) failedContracts.push(fa);
  }

  // Second pass: throttled simulation. 3 concurrent workers, up to 3 attempts
  // per op with exponential backoff. Anything still failing after retries is
  // recorded as a real contract failure.
  const total = taggedOps.length;
  let cursor = 0;
  let done = 0;
  const survivingOps: OpWithGas[] = [];
  async function worker() {
    while (cursor < taggedOps.length) {
      const idx = cursor++;
      const { fa, op } = taggedOps[idx]!;
      let attempts = 0;
      let estGas: number | null = null;
      while (attempts < 3 && estGas === null) {
        try {
          const ests = await tezos.estimate.batch([op]);
          estGas = ests.reduce((s, e) => s + e.gasLimit, 0);
        } catch {
          attempts++;
          if (attempts < 3) {
            await new Promise((r) => setTimeout(r, 400 * 2 ** (attempts - 1)));
          }
        }
      }
      if (estGas !== null && estGas <= MAX_PER_OP_GAS) {
        survivingOps.push({ op, gas: estGas, fa });
      } else {
        // Either simulation rejected (estGas null) or gas is too close to the
        // protocol cap to sign safely. Flag the contract for the user.
        if (!failedContracts.includes(fa)) failedContracts.push(fa);
      }
      done++;
      onProgress?.(done, total);
    }
  }
  await Promise.all(Array.from({ length: 3 }, () => worker()));

  return { ops: survivingOps, failedContracts, failedTokens };
}

/** Estimate a packed batch against the RPC. If it fails, recursively halve
 *  and try each half. Returns the batches that estimated cleanly plus the
 *  set of FA addresses whose ops couldn't be sent at any size (single-op
 *  batches that still fail). Single-op estimation already happened in the
 *  diagnostic; this catches cross-op gas effects that show up only when ops
 *  are packed together — the most common cause of "gas_limit_too_high" mid-
 *  signing despite a clean diagnostic. */
export async function validatePackedBatches(
  packed: OpWithGas[][],
  onProgress?: (done: number, total: number) => void,
): Promise<{ valid: WalletParamsWithKind[][]; failedContracts: string[] }> {
  const tezos = getTezos();
  const failedContracts: string[] = [];
  const valid: WalletParamsWithKind[][] = [];
  let done = 0;
  const total = packed.reduce((s, b) => s + b.length, 0);

  async function check(batch: OpWithGas[]): Promise<void> {
    if (batch.length === 0) return;
    try {
      await tezos.estimate.batch(batch.map((b) => b.op));
      valid.push(batch.map((b) => b.op));
      done += batch.length;
      onProgress?.(done, total);
    } catch {
      if (batch.length === 1) {
        const fa = batch[0]!.fa;
        if (!failedContracts.includes(fa)) failedContracts.push(fa);
        done += 1;
        onProgress?.(done, total);
        return;
      }
      const mid = Math.floor(batch.length / 2);
      // Sequential, not parallel — keeps RPC pressure low.
      await check(batch.slice(0, mid));
      await check(batch.slice(mid));
    }
  }

  for (const batch of packed) await check(batch);
  return { valid, failedContracts };
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
  // Dedupe contract fetches — same FA1.2 token may appear once per recipient.
  const uniqueFas = [...new Set(transfers.map((t) => t.fa))];
  const settled = await Promise.allSettled(
    uniqueFas.map((fa) => tezos.wallet.at(fa)),
  );
  const failed: string[] = [];
  const contractByFa = new Map<string, Awaited<ReturnType<typeof tezos.wallet.at>>>();
  settled.forEach((res, i) => {
    if (res.status === "rejected") failed.push(uniqueFas[i]!);
    else contractByFa.set(uniqueFas[i]!, res.value);
  });
  // Build params per transfer; non-standard FA1.2 schemas can throw here, in
  // which case we mark the FA address as failed and surface it like any other.
  const ops: WalletParamsWithKind[] = [];
  for (const t of transfers) {
    if (failed.includes(t.fa)) continue;
    try {
      const params = contractByFa
        .get(t.fa)!
        .methodsObject.transfer({ from: sender, to: t.to, value: t.amount })
        .toTransferParams();
      ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
    } catch {
      if (!failed.includes(t.fa)) failed.push(t.fa);
    }
  }
  if (failed.length > 0) throw new BatchBuildError(failed);
  return ops;
}

export interface SendResult {
  opHash: string;
}

export async function sendBatch(
  ops: WalletParamsWithKind[],
  opts: { waitConfirmation?: boolean } = {},
): Promise<SendResult> {
  if (ops.length === 0) throw new Error("No operations to send");
  const tezos = getTezos();
  const op = await tezos.wallet.batch(ops).send();
  // For multi-batch flows (e.g. /migrate/sweep), wait for inclusion before
  // returning so the wallet picks up the new counter. Otherwise the next
  // batch can collide with this one in the mempool.
  if (opts.waitConfirmation) await op.confirmation(1);
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
  // objkt v1 / v4 / v6 / v6.1 / v6.2 — retract_ask(nat)
  KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq: "retract_ask",
  KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC: "retract_ask",
  KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4: "retract_ask",
  KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY: "retract_ask",
  KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X: "retract_ask",
  // objkt fixed-pricing handlers (open editions) — different shape: unlist(nat)
  KT1NiZkkW82wsTKP95x8FefdiseDyU9vX66W: "unlist",
  KT1KzmnX6Ffip7zVgGiCUV6ygqDU8hhGsMAy: "unlist",
  // HEN v2, Teia
  KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn: "cancel_swap",
  KT1PHubm9HtyQEJ4BBpMTVomq6mhbfNZ9z5w: "cancel_swap",
};

export function isCancellable(marketplaceContract: string): boolean {
  return marketplaceContract in CANCEL_BY_MARKETPLACE;
}

// Marketplaces that accept incoming offers via `fulfill_offer({ offer_id, … })`.
// FP handlers (KT1NiZkk… / KT1KzmnX…) don't accept offers at all — excluded.
const ACCEPT_VIA_FULFILL_OFFER: ReadonlySet<string> = new Set([
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq", // objkt v1
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC", // objkt v4
  "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4", // objkt v6
  "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY", // objkt v6.1
  "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X", // objkt v6.2
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

/** Per-marketplace entrypoint shape used by buildBuyBatch. */
type BuyHandler =
  /** objkt v6+: fulfill_ask({ ask_id, amount, proxy_for, condition_extra, referrers }) */
  | "fulfill_ask"
  /** objkt v4: fulfill_ask({ ask_id, proxy?: address }) — no amount, no referrers */
  | "fulfill_ask_v4"
  /** HEN v2 / Teia: collect(swap_id: nat) — bare nat */
  | "collect_swap"
  /** HEN v1: collect({ objkt_amount: nat, swap_id: nat }) */
  | "collect_swap_v1";

const BUY_HANDLERS: Readonly<Record<string, BuyHandler>> = {
  // objkt v6+ — fulfill_ask(ask_id, amount, proxy_for, condition_extra, referrers).
  "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4": "fulfill_ask", // objkt v6
  "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY": "fulfill_ask", // objkt v6.1
  "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X": "fulfill_ask", // objkt v6.2
  // objkt v4 — minimal fulfill_ask({ ask_id, proxy? }), no referrer support.
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC": "fulfill_ask_v4", // objkt v4
  // HEN v2 + Teia (Teia is a HEN fork) — collect(swap_id: nat). No referrer field.
  "KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn": "collect_swap", // HEN v2
  "KT1PHubm9HtyQEJ4BBpMTVomq6mhbfNZ9z5w": "collect_swap", // Teia
  // HEN v1 — collect({ objkt_amount: nat, swap_id: nat }).
  "KT1Hkg5qeNhfwpKW4fXvq7HGZB9z2EnmCCA9": "collect_swap_v1", // HEN v1
};

export function isBuyable(marketplaceContract: string): boolean {
  return marketplaceContract in BUY_HANDLERS;
}

// Bulk buy on objkt v6.2 via fulfill_ask_bulk — N listings in one signed op.
const OBJKT_V62_FOR_BULK = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";

/** Sweep mixed-marketplace asks in a single signed batch.
 *  - objkt v6.2 asks are coalesced into one `fulfill_ask_bulk` op (efficient).
 *  - All other marketplaces (objkt v6/v6.1/v4, HEN v1/v2, Teia) issue
 *    individual ops via buildBuyBatch — wallet still signs them as one batch. */
export async function buildBulkBuy(
  buyerAddress: string,
  buys: BuyAsk[],
  /** atomic=true means all-or-nothing for the v6.2 bulk op; non-v6.2 ops are
   *  always non-atomic (they're separate operations in the same batch). */
  atomic = false,
): Promise<WalletParamsWithKind[]> {
  if (buys.length === 0) return [];

  // Split: v6.2 → coalesce; everything else → individual ops via buildBuyBatch.
  const v62Asks = buys.filter((b) => b.marketplaceContract === OBJKT_V62_FOR_BULK);
  const otherBuys = buys.filter((b) => b.marketplaceContract !== OBJKT_V62_FOR_BULK);

  const ops: WalletParamsWithKind[] = [];

  if (v62Asks.length === 1) {
    // Single v6.2 ask isn't worth the bulk wrapper.
    ops.push(...(await buildBuyBatch(buyerAddress, v62Asks)));
  } else if (v62Asks.length > 1) {
    const tezos = getTezos();
    const { REFERRAL_WALLET } = await import("@/lib/constants");
    const total = v62Asks.reduce((s, a) => s + a.priceMutez * a.amount, 0);
    const asksMap: Record<string, { amount: number; condition_extra: null }> = {};
    for (const a of v62Asks) {
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
    ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
  }

  if (otherBuys.length > 0) {
    ops.push(...(await buildBuyBatch(buyerAddress, otherBuys)));
  }

  return ops;
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
    const handler = BUY_HANDLERS[b.marketplaceContract];
    if (!handler) {
      throw new Error(
        `Buy not supported for marketplace ${b.marketplaceContract} — use the marketplace's UI directly.`,
      );
    }
    const mkt = await tezos.wallet.at(b.marketplaceContract);
    const totalMutez = b.priceMutez * b.amount;
    if (handler === "fulfill_ask") {
      const params = mkt.methodsObject
        .fulfill_ask({
          ask_id: b.askId,
          amount: b.amount,
          proxy_for: buyerAddress,
          condition_extra: null,
          referrers: { [REFERRAL_WALLET]: 10000 },
        })
        .toTransferParams({ amount: totalMutez, mutez: true });
      ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
    } else if (handler === "fulfill_ask_v4") {
      // objkt v4: minimal `fulfill_ask({ ask_id, proxy? })`. No amount field
      // (one edition per call) and no referrer support. Issue one op per edition.
      for (let i = 0; i < b.amount; i++) {
        const params = mkt.methodsObject
          .fulfill_ask({ ask_id: b.askId, proxy: buyerAddress })
          .toTransferParams({ amount: b.priceMutez, mutez: true });
        ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
      }
    } else if (handler === "collect_swap") {
      // HEN v2 / Teia: collect(swap_id : nat). One op per edition.
      for (let i = 0; i < b.amount; i++) {
        const params = mkt.methodsObject
          .collect(b.askId)
          .toTransferParams({ amount: b.priceMutez, mutez: true });
        ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
      }
    } else {
      // HEN v1: collect({ objkt_amount: nat, swap_id: nat }). objkt_amount is
      // editions per call — we can use it directly instead of looping.
      const params = mkt.methodsObject
        .collect({ objkt_amount: b.amount, swap_id: b.askId })
        .toTransferParams({ amount: totalMutez, mutez: true });
      ops.push({ kind: "transaction" as const, ...params } as WalletParamsWithKind);
    }
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

  // Phase 2: fulfill each offer. Schema across objkt v4 / v6 / v6.1 / v6.2 is
  // `fulfill_offer({ offer_id: nat, token_id?: nat, [condition_extra?: bytes,
  // referrers?: map] })`. Pass the object form via methodsObject; v6 also
  // accepts a `referrers` field but we omit it here (offers route royalties
  // through a different mechanism from list buys).
  for (const o of offers) {
    const mkt = await tezos.wallet.at(o.marketplaceContract);
    const params = mkt.methodsObject
      .fulfill_offer({ offer_id: o.offerId })
      .toTransferParams();
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
