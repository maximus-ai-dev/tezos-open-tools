/**
 * Scan-mode harness — auto-discovers state from a real wallet's existing
 * listings, offers, and holdings, then dry-runs the relevant operation
 * builders against each. No setup required, no key needed.
 *
 * Usage:
 *   pnpm test:scan
 *
 * Reads from .env.local:
 *   TEZOS_TEST_ADDRESS_A   address (tz...) of the wallet to scan
 *   TEZOS_TEST_KEY_B       OPTIONAL — burner key for the giveaway leg
 *   TEZOS_RPC              optional, defaults to ecadinfra mainnet
 *
 * What it does:
 *   - Picks up to 3 of your active cancellable listings → dry-run cancel each
 *   - Picks up to 3 of your incoming acceptable offers → dry-run accept each
 *   - Picks 1 token you hold → dry-run a 1-edition transfer to a burn address
 *
 * Everything is dry-run via tezos.estimate.batch — no signing, no broadcast.
 * Failures here surface real bugs in our operation builders before any real tx.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { TezosToolkit } from "@taquito/taquito";
import {
  buildAcceptOffersBatch,
  buildBatchListings,
  buildCancelBatch,
  buildFa2BatchTransfer,
  isAcceptableOffer,
  isCancellable,
} from "./lib/nodeOps";
import {
  getOffersReceived,
  getSellerListings,
} from "./lib/walletState";
import { fetchPublicKey, ReadOnlySigner } from "./lib/readOnlySigner";
import { tzktFetch } from "../src/lib/tzkt/client";
import { MARKETPLACE_NAMES } from "../src/lib/constants";

const TEZOS_RPC = process.env.TEZOS_RPC ?? "https://mainnet.tezos.ecadinfra.com";

const COLOR = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};
function header(s: string) { console.log(`\n${COLOR.bold}${COLOR.blue}━━━ ${s} ━━━${COLOR.reset}`); }
function ok(s: string) { console.log(`${COLOR.green}✓${COLOR.reset} ${s}`); }
function warn(s: string) { console.log(`${COLOR.yellow}!${COLOR.reset} ${s}`); }
function fail(s: string) { console.log(`${COLOR.red}✗${COLOR.reset} ${s}`); }
function dim(s: string) { console.log(`${COLOR.dim}${s}${COLOR.reset}`); }

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

interface BalanceRow {
  account: { address: string };
  balance: string;
  token: { contract: { address: string }; tokenId: string; standard: string };
}

async function findHeldToken(address: string): Promise<{ fa: string; tokenId: string } | null> {
  const rows = await tzktFetch<BalanceRow[]>("/tokens/balances", {
    account: address,
    "balance.gt": 0,
    "token.standard": "fa2",
    "sort.desc": "lastTime",
    limit: 5,
    select: "balance,token,account",
  }).catch(() => []);
  if (rows.length === 0) return null;
  const r = rows[0];
  return { fa: r.token.contract.address, tokenId: r.token.tokenId };
}

async function main() {
  console.log(`${COLOR.bold}Tezos NFT Toolkit — scan-mode dry-run${COLOR.reset}`);
  console.log(`RPC: ${TEZOS_RPC}`);

  const address = required("TEZOS_TEST_ADDRESS_A");
  const pk = await fetchPublicKey(address);
  if (!pk) {
    fail(`Could not fetch public key for ${address}. Account must have revealed (sent at least one outgoing op).`);
    process.exit(1);
  }
  const tezos = new TezosToolkit(TEZOS_RPC);
  tezos.setProvider({ signer: new ReadOnlySigner(address, pk) });
  console.log(`Wallet: ${address}`);

  let totalChecks = 0;
  let totalPass = 0;

  // ─────────────────────────────────────────────────────────────────
  header("Cancel listings — dry-run");

  const allListings = await getSellerListings(address, { limit: 100 }).catch(() => []);
  const cancellable = allListings.filter((l) => isCancellable(l.marketplace_contract));
  const skipped = allListings.length - cancellable.length;
  if (allListings.length === 0) {
    warn("No active listings on this wallet — skipping cancel tests.");
  } else {
    ok(`Found ${allListings.length} active listings (${cancellable.length} cancellable by harness, ${skipped} skipped as out-of-scope).`);
    const sample = cancellable.slice(0, 3);
    for (const l of sample) {
      const tokenLabel = l.token?.name ?? `${l.token?.fa_contract?.slice(0, 8)}…:${l.token?.token_id}`;
      const mkt = MARKETPLACE_NAMES[l.marketplace_contract] ?? l.marketplace_contract.slice(0, 10) + "…";
      try {
        const ops = await buildCancelBatch(tezos, [
          { marketplaceContract: l.marketplace_contract, bigmapKey: l.bigmap_key as number },
        ]);
        const ests = await tezos.estimate.batch(ops);
        const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
        ok(`cancel ${mkt} #${l.bigmap_key} (${tokenLabel}, ${l.price / 1e6} ꜩ) — gas ${gas}`);
        totalPass++;
      } catch (err) {
        fail(`cancel ${mkt} #${l.bigmap_key} (${tokenLabel}) — ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
      }
      totalChecks++;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  header("Accept offers — dry-run");

  const allOffers = await getOffersReceived(address, { limit: 100 }).catch(() => []);
  const acceptable = allOffers.filter(
    (o) =>
      o.token !== null &&
      o.bigmap_key !== null &&
      o.marketplace_contract !== null &&
      isAcceptableOffer(o.marketplace_contract),
  );
  if (allOffers.length === 0) {
    warn("No incoming offers on this wallet — skipping accept tests.");
  } else {
    ok(`Found ${allOffers.length} incoming offers (${acceptable.length} acceptable by harness).`);
    const sample = acceptable.slice(0, 3);
    for (const o of sample) {
      const tokenLabel = o.token?.name ?? `${o.token?.fa_contract?.slice(0, 8)}…:${o.token?.token_id}`;
      const mkt = MARKETPLACE_NAMES[o.marketplace_contract!] ?? o.marketplace_contract!.slice(0, 10) + "…";
      try {
        const ops = await buildAcceptOffersBatch(tezos, address, [
          {
            offerId: o.bigmap_key as number,
            marketplaceContract: o.marketplace_contract!,
            fa: o.token!.fa_contract,
            tokenId: o.token!.token_id,
          },
        ]);
        const ests = await tezos.estimate.batch(ops);
        const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
        ok(`accept ${mkt} #${o.bigmap_key} (${tokenLabel}, ${(o.price_xtz ?? o.price) / 1e6} ꜩ) — gas ${gas}`);
        totalPass++;
      } catch (err) {
        fail(`accept ${mkt} #${o.bigmap_key} (${tokenLabel}) — ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
      }
      totalChecks++;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  header("Transfer — dry-run");

  const held = await findHeldToken(address);
  if (!held) {
    warn("No FA2 tokens held by this wallet — skipping transfer test.");
  } else {
    const burnAddr = "tz1burnburnburnburnburnburnburjAYjjX";
    try {
      const ops = await buildFa2BatchTransfer(tezos, address, [
        { fa: held.fa, tokenId: held.tokenId, to: burnAddr, amount: 1 },
      ]);
      const ests = await tezos.estimate.batch(ops);
      const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
      ok(`transfer 1 of ${held.fa.slice(0, 10)}…:${held.tokenId} → ${burnAddr.slice(0, 10)}… — gas ${gas}`);
      totalPass++;
    } catch (err) {
      fail(`transfer ${held.fa.slice(0, 10)}…:${held.tokenId} — ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    }
    totalChecks++;
  }

  // ─────────────────────────────────────────────────────────────────
  header("Batch listing creation — dry-run (objkt v6.2 ask)");

  if (!held) {
    warn("No FA2 token held to test listing creation.");
  } else {
    try {
      const ops = await buildBatchListings(tezos, address, [
        { fa: held.fa, tokenId: held.tokenId, priceMutez: 1_000_000, editions: 1 },
      ]);
      const ests = await tezos.estimate.batch(ops);
      const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
      ok(`list 1 of ${held.fa.slice(0, 10)}…:${held.tokenId} for 1 ꜩ — ${ops.length} ops, gas ${gas}`);
      totalPass++;
    } catch (err) {
      fail(`list ${held.fa.slice(0, 10)}…:${held.tokenId} — ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    }
    totalChecks++;
  }

  // ─────────────────────────────────────────────────────────────────
  header("Giveaway / multi-recipient transfer — dry-run");

  if (!held) {
    warn("No FA2 token held to test giveaway.");
  } else {
    const recipients = [
      "tz1burnburnburnburnburnburnburjAYjjX",
      "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg",
    ];
    try {
      const ops = await buildFa2BatchTransfer(
        tezos,
        address,
        recipients.map((to) => ({ fa: held.fa, tokenId: held.tokenId, to, amount: 1 })),
      );
      const ests = await tezos.estimate.batch(ops);
      const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
      ok(`giveaway 1 each to ${recipients.length} addrs — ${ops.length} ops, gas ${gas}`);
      totalPass++;
    } catch (err) {
      fail(`giveaway — ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    }
    totalChecks++;
  }

  // ─────────────────────────────────────────────────────────────────
  header("Summary");
  console.log(`  ${totalPass}/${totalChecks} dry-run checks passed.`);
  if (totalPass === totalChecks) {
    ok("All operation builders produce operations that the mainnet RPC says would succeed.");
  } else {
    fail(`${totalChecks - totalPass} check(s) failed — these are real bugs in our operation construction or contract dispatch.`);
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) dim(err.stack);
  process.exit(1);
});
