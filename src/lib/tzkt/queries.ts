import { tzktFetch } from "./client";
import type { TzktTransfer, TzktTransaction } from "./types";

export interface TokenTransfersOpts {
  fa: string;
  tokenId: string;
  limit?: number;
  offset?: number;
}

export function getTokenTransfers({
  fa,
  tokenId,
  limit = 100,
  offset = 0,
}: TokenTransfersOpts): Promise<TzktTransfer[]> {
  return tzktFetch<TzktTransfer[]>("/tokens/transfers", {
    "token.contract": fa,
    "token.tokenId": tokenId,
    limit,
    offset,
    "sort.desc": "timestamp",
  });
}

export interface TransactionsByIdsOpts {
  ids: number[];
}

export function getTransactionsByIds({ ids }: TransactionsByIdsOpts): Promise<TzktTransaction[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return tzktFetch<TzktTransaction[]>("/operations/transactions", {
    "id.in": ids.join(","),
    limit: Math.min(ids.length, 1000),
  });
}

export interface AccountTransfersOpts {
  account: string;
  direction: "from" | "to";
  limit?: number;
}

// Mixed-kind operations originated by an account. Used by /ops to show
// the connected wallet's recent signed transactions (and reveals).
export interface TzktAccountOp {
  type: string; // "transaction" | "reveal" | "origination" | "delegation" | ...
  id: number;
  timestamp: string;
  hash: string;
  status?: "applied" | "failed" | "backtracked" | "skipped";
  level: number;
  amount?: number;
  target?: { alias?: string | null; address: string } | null;
  parameter?: { entrypoint: string; value: unknown } | null;
}

export function getAccountOps(
  address: string,
  opts: { limit?: number } = {},
): Promise<TzktAccountOp[]> {
  const { limit = 30 } = opts;
  return tzktFetch<TzktAccountOp[]>(`/accounts/${address}/operations`, {
    type: "transaction,reveal,origination,delegation",
    "sort.desc": "id",
    limit,
  });
}

export interface TzktBlock {
  level: number;
  hash: string;
  timestamp: string;
  proposer?: { alias?: string | null; address: string } | null;
  transactionsCount?: number;
  reward?: number;
  blockRound?: number;
}

export function getRecentBlocks(limit = 10): Promise<TzktBlock[]> {
  return tzktFetch<TzktBlock[]>("/blocks", {
    "sort.desc": "level",
    limit,
    select: "level,hash,timestamp,proposer,transactionsCount",
  });
}

export interface TzktHead {
  level: number;
  hash: string;
  timestamp: string;
  cycle: number;
  protocol: string;
  synced: boolean;
}

export function getHead(): Promise<TzktHead> {
  return tzktFetch<TzktHead>("/head");
}

export function getOperationsByTarget(
  target: string,
  opts: { limit?: number; minLevel?: number } = {},
): Promise<TzktTransaction[]> {
  const { limit = 50, minLevel } = opts;
  return tzktFetch<TzktTransaction[]>("/operations/transactions", {
    "target.eq": target,
    "level.ge": minLevel,
    "sort.desc": "id",
    limit,
  });
}

export interface TzktEvent {
  id: number;
  level: number;
  timestamp: string;
  contract: { alias?: string | null; address: string };
  tag: string;
  payload: unknown;
  transactionId?: number | null;
}

export function getContractEvents(
  contract: string,
  opts: { limit?: number; tag?: string } = {},
): Promise<TzktEvent[]> {
  const { limit = 100, tag } = opts;
  return tzktFetch<TzktEvent[]>("/contracts/events", {
    "contract.eq": contract,
    tag,
    "sort.desc": "id",
    limit,
  });
}

// All non-zero token balances held by an account — across FA1.2 and FA2,
// including NFTs, fungibles, and scam drops. Used by /migrate/sweep.
export interface TzktBalance {
  account: { address: string };
  token: {
    id: number;
    contract: { address: string; alias?: string | null };
    tokenId: string;
    standard: "fa1.2" | "fa2" | string;
    metadata?: {
      name?: string | null;
      symbol?: string | null;
      decimals?: string | null;
      thumbnailUri?: string | null;
      displayUri?: string | null;
      artifactUri?: string | null;
    } | null;
  };
  balance: string;
  firstTime?: string;
  lastTime?: string;
}

export function getAccountTokenBalances(
  account: string,
  opts: { limit?: number } = {},
): Promise<TzktBalance[]> {
  const { limit = 10000 } = opts;
  return tzktFetch<TzktBalance[]>("/tokens/balances", {
    account,
    "balance.gt": 0,
    "sort.desc": "lastTime",
    limit,
  });
}

// Returns FA1.2 / FA2 token transfers where the given account is on the chosen side.
export function getAccountTokenTransfers({
  account,
  direction,
  limit = 1000,
}: AccountTransfersOpts): Promise<TzktTransfer[]> {
  return tzktFetch<TzktTransfer[]>("/tokens/transfers", {
    [`${direction}.eq`]: account,
    "token.standard": "fa2",
    "sort.desc": "timestamp",
    limit,
    select:
      "id,level,timestamp,token,from,to,amount,transactionId,originationId,migrationId",
  });
}
