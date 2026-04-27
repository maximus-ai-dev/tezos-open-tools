// A Taquito signer that knows an address + public key but cannot sign anything.
// Lets `tezos.estimate.batch(...)` simulate operations as if they came from
// that address — no private key needed, no risk of accidentally broadcasting.

import { tzktFetch } from "../../src/lib/tzkt/client";

export class ReadOnlySigner {
  constructor(private readonly pkh: string, private readonly pk: string) {}

  async publicKeyHash(): Promise<string> {
    return this.pkh;
  }

  async publicKey(): Promise<string> {
    return this.pk;
  }

  async secretKey(): Promise<never> {
    throw new Error("ReadOnlySigner has no secret key — operations cannot be signed.");
  }

  async sign(): Promise<never> {
    throw new Error(
      "ReadOnlySigner cannot sign. Use --dry-run for read-only addresses, or supply an edsk for live mode.",
    );
  }
}

interface TzktAccount {
  address: string;
  publicKey?: string | null;
  revealed?: boolean;
  type?: string;
}

/**
 * Fetches the public key for a Tezos address from TzKT.
 * The pubkey is exposed on-chain only after the account makes its first outgoing op
 * (the "reveal"). Returns null if the account has never revealed.
 */
export async function fetchPublicKey(address: string): Promise<string | null> {
  try {
    const acct = await tzktFetch<TzktAccount>(`/accounts/${address}`);
    return acct.publicKey ?? null;
  } catch {
    return null;
  }
}
