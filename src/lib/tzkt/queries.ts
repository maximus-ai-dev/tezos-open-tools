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
