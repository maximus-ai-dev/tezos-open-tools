export interface TzktAccount {
  alias?: string | null;
  address: string;
}

export interface TzktTokenContract {
  alias?: string | null;
  address: string;
}

export interface TzktTokenMetadata {
  name?: string | null;
  symbol?: string | null;
  description?: string | null;
  artifactUri?: string | null;
  displayUri?: string | null;
  thumbnailUri?: string | null;
  creators?: string[] | null;
  decimals?: string | null;
  formats?: Array<{ uri?: string; mimeType?: string }> | null;
  tags?: string[] | null;
}

export interface TzktToken {
  id: number;
  contract: TzktTokenContract;
  tokenId: string;
  standard: "fa1.2" | "fa2" | string;
  totalSupply?: string;
  metadata?: TzktTokenMetadata | null;
}

export interface TzktTransfer {
  id: number;
  level: number;
  timestamp: string;
  token: TzktToken;
  from?: TzktAccount | null;
  to?: TzktAccount | null;
  amount: string;
  transactionId?: number | null;
  originationId?: number | null;
  migrationId?: number | null;
}

export interface TzktTransaction {
  id: number;
  level: number;
  timestamp: string;
  hash: string;
  sender: TzktAccount;
  target?: TzktAccount | null;
  initiator?: TzktAccount | null;
  amount: number;
  status: "applied" | "failed" | "backtracked" | "skipped";
  parameter?: {
    entrypoint: string;
    value: unknown;
  } | null;
  storage?: unknown;
  diffs?: unknown;
  block?: string;
  errors?: unknown;
}
