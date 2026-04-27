/**
 * End-to-end test harness for the wallet-write tools.
 *
 * Usage:
 *   pnpm test:wallet --dry-run            # simulate everything via RPC, no signing, no sends
 *   pnpm test:wallet --live               # real transactions on mainnet — costs gas
 *   pnpm test:wallet --dry-run --only=2   # run only test #2
 *
 * Reads from .env.local:
 *   TEZOS_TEST_ADDRESS_A   address (tz...) of wallet A — the seller. Always required.
 *   TEZOS_TEST_KEY_A       OPTIONAL edsk... — only set if you want to live-test A from this harness.
 *                          If unset, A runs in read-only mode (dry-run only for A-signed tests).
 *   TEZOS_TEST_KEY_B       edsk... of wallet B (the burner buyer/offerer). Required.
 *   TEZOS_TEST_FA          FA2 contract of the test NFT
 *   TEZOS_TEST_TOKEN_ID    token id within that contract
 *   TEZOS_TEST_EDITIONS    optional, hint for how many editions wallet A holds
 *   TEZOS_RPC              optional, defaults to ecadinfra mainnet
 *
 * Tests, in execution order:
 *   1. cancel-listing  — wallet A retracts its active listing for the token  (A signs)
 *   2. accept-offer    — wallet A fulfils wallet B's incoming offer          (A signs)
 *   3. transfer        — wallet A sends 1 edition to wallet B                (A signs)
 *   4. giveaway        — wallet B sends 1 edition to each of 2 burn addrs    (B signs)
 *
 * If wallet A is read-only (no edsk), tests 1-3 dry-run only — to live-test those
 * paths, click through /artist/sale, /artist/offers, /migrate/transfer in the
 * browser with your real wallet connected.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import {
  buildAcceptOffersBatch,
  buildCancelBatch,
  buildFa2BatchTransfer,
  isAcceptableOffer,
  isCancellable,
} from "./lib/nodeOps";
import {
  getOffersReceived,
  getSellerListings,
  snapshotWallet,
} from "./lib/walletState";
import { fetchPublicKey, ReadOnlySigner } from "./lib/readOnlySigner";

interface Args {
  mode: "dry-run" | "live";
  only: number | null;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const mode =
    args.includes("--live") ? ("live" as const) :
    args.includes("--dry-run") ? ("dry-run" as const) :
    null;
  if (!mode) {
    console.error("Pass --dry-run or --live");
    process.exit(2);
  }
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg ? Number(onlyArg.split("=")[1]) : null;
  return { mode, only };
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

const TEZOS_RPC = process.env.TEZOS_RPC ?? "https://mainnet.tezos.ecadinfra.com";

interface Wallet {
  tezos: TezosToolkit;
  address: string;
  canSign: boolean;
}

async function makeWalletFromKey(privateKey: string): Promise<Wallet> {
  const tezos = new TezosToolkit(TEZOS_RPC);
  const signer = new InMemorySigner(privateKey);
  tezos.setProvider({ signer });
  const address = await signer.publicKeyHash();
  return { tezos, address, canSign: true };
}

async function makeWalletReadOnly(address: string): Promise<Wallet> {
  const pk = await fetchPublicKey(address);
  if (!pk) {
    throw new Error(
      `Cannot fetch public key for ${address}. The account must have revealed (sent at least one outgoing operation) before it can be simulated.`,
    );
  }
  const tezos = new TezosToolkit(TEZOS_RPC);
  tezos.setProvider({ signer: new ReadOnlySigner(address, pk) });
  return { tezos, address, canSign: false };
}

const COLOR = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};
function header(s: string) {
  console.log(`\n${COLOR.bold}${COLOR.blue}━━━ ${s} ━━━${COLOR.reset}`);
}
function ok(s: string) { console.log(`${COLOR.green}✓${COLOR.reset} ${s}`); }
function warn(s: string) { console.log(`${COLOR.yellow}!${COLOR.reset} ${s}`); }
function fail(s: string) { console.log(`${COLOR.red}✗${COLOR.reset} ${s}`); }
function dim(s: string) { console.log(`${COLOR.dim}${s}${COLOR.reset}`); }

async function snapshot(label: string, address: string, fa: string, tokenId: string) {
  const s = await snapshotWallet(address, fa, tokenId);
  dim(
    `  [${label}] ${address.slice(0, 10)}…  bal=${s.tokenBalance}  listings=${s.activeListings}  incoming-offers=${s.incomingOffers}`,
  );
}

type BatchOps = NonNullable<Parameters<TezosToolkit["contract"]["batch"]>[0]>;

async function runDryOrLive(
  wallet: Wallet,
  ops: BatchOps,
  mode: Args["mode"],
): Promise<{ kind: "estimated"; gas: number } | { kind: "applied"; opHash: string }> {
  if (mode === "dry-run") {
    const ests = await wallet.tezos.estimate.batch(ops);
    const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
    return { kind: "estimated", gas };
  }
  if (!wallet.canSign) {
    throw new Error(
      `Wallet ${wallet.address} is read-only. Provide an edsk in env to live-test, or run with --dry-run.`,
    );
  }
  const op = await wallet.tezos.contract.batch(ops).send();
  await op.confirmation(1);
  return { kind: "applied", opHash: op.hash };
}

interface TestContext {
  args: Args;
  fa: string;
  tokenId: string;
  walletA: Wallet;
  walletB: Wallet;
}

async function testCancelListing(ctx: TestContext): Promise<void> {
  header("Test 1 — Cancel listing (wallet A signs)");
  const { walletA, fa, tokenId } = ctx;

  await snapshot("before A", walletA.address, fa, tokenId);

  const listings = await getSellerListings(walletA.address, { limit: 100 });
  const target = listings.find(
    (l) => l.token?.fa_contract === fa && l.token?.token_id === tokenId,
  );
  if (!target) {
    fail(`Wallet A has no active listing for ${fa}:${tokenId}. Set one up on objkt first.`);
    return;
  }
  if (!target.bigmap_key || !isCancellable(target.marketplace_contract)) {
    fail(`Listing on marketplace ${target.marketplace_contract} isn't supported.`);
    return;
  }
  ok(
    `Found listing #${target.bigmap_key} on ${target.marketplace_contract.slice(0, 10)}… for ${target.price / 1e6} ꜩ`,
  );

  const ops = await buildCancelBatch(walletA.tezos, [
    { marketplaceContract: target.marketplace_contract, bigmapKey: target.bigmap_key },
  ]);
  ok(`Built ${ops.length} operation(s)`);

  const res = await runDryOrLive(walletA, ops, ctx.args.mode);
  if (res.kind === "estimated") {
    ok(`Dry-run OK — estimated gas ${res.gas}`);
  } else {
    ok(`Sent — op hash ${res.opHash}`);
    await snapshot("after A", walletA.address, fa, tokenId);
  }
}

async function testAcceptOffer(ctx: TestContext): Promise<void> {
  header("Test 2 — Accept incoming offer (wallet A signs)");
  const { walletA, walletB, fa, tokenId } = ctx;

  await snapshot("before A", walletA.address, fa, tokenId);
  await snapshot("before B", walletB.address, fa, tokenId);

  const offers = await getOffersReceived(walletA.address, { limit: 100 });
  const target = offers.find(
    (o) =>
      o.token?.fa_contract === fa &&
      o.token?.token_id === tokenId &&
      o.buyer_address === walletB.address,
  );
  if (!target) {
    fail(`No incoming offer from wallet B on ${fa}:${tokenId}. Place one on objkt from B.`);
    return;
  }
  if (
    !target.bigmap_key ||
    !target.marketplace_contract ||
    !isAcceptableOffer(target.marketplace_contract)
  ) {
    fail(
      `Offer on marketplace ${target.marketplace_contract} isn't accept-able by this harness.`,
    );
    return;
  }
  ok(
    `Found offer #${target.bigmap_key} on ${target.marketplace_contract.slice(0, 10)}… for ${(target.price_xtz ?? target.price) / 1e6} ꜩ`,
  );

  const ops = await buildAcceptOffersBatch(walletA.tezos, walletA.address, [
    {
      offerId: target.bigmap_key,
      marketplaceContract: target.marketplace_contract,
      fa,
      tokenId,
    },
  ]);
  ok(`Built ${ops.length} operation(s) (operator add → fulfill_offer → operator remove)`);

  const res = await runDryOrLive(walletA, ops, ctx.args.mode);
  if (res.kind === "estimated") {
    ok(`Dry-run OK — estimated gas ${res.gas}`);
  } else {
    ok(`Sent — op hash ${res.opHash}`);
    await snapshot("after A", walletA.address, fa, tokenId);
    await snapshot("after B", walletB.address, fa, tokenId);
  }
}

async function testTransfer(ctx: TestContext): Promise<void> {
  header("Test 3 — Transfer 1 edition A → B (wallet A signs)");
  const { walletA, walletB, fa, tokenId } = ctx;

  await snapshot("before A", walletA.address, fa, tokenId);
  await snapshot("before B", walletB.address, fa, tokenId);

  const ops = await buildFa2BatchTransfer(walletA.tezos, walletA.address, [
    { fa, tokenId, to: walletB.address, amount: 1 },
  ]);
  ok(`Built ${ops.length} operation(s)`);

  const res = await runDryOrLive(walletA, ops, ctx.args.mode);
  if (res.kind === "estimated") {
    ok(`Dry-run OK — estimated gas ${res.gas}`);
  } else {
    ok(`Sent — op hash ${res.opHash}`);
    await snapshot("after A", walletA.address, fa, tokenId);
    await snapshot("after B", walletB.address, fa, tokenId);
  }
}

async function testGiveaway(ctx: TestContext): Promise<void> {
  header("Test 4 — Giveaway (wallet B signs)");
  const { walletB, fa, tokenId } = ctx;

  await snapshot("before B", walletB.address, fa, tokenId);

  const burner1 = "tz1burnburnburnburnburnburnburjAYjjX";
  const burner2 = "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg";

  const ops = await buildFa2BatchTransfer(walletB.tezos, walletB.address, [
    { fa, tokenId, to: burner1, amount: 1 },
    { fa, tokenId, to: burner2, amount: 1 },
  ]);
  ok(`Built ${ops.length} operation(s)`);
  warn(`Recipients are official burn addresses — irreversibly destroys the editions.`);

  const res = await runDryOrLive(walletB, ops, ctx.args.mode);
  if (res.kind === "estimated") {
    ok(`Dry-run OK — estimated gas ${res.gas}`);
  } else {
    ok(`Sent — op hash ${res.opHash}`);
    await snapshot("after B", walletB.address, fa, tokenId);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(`${COLOR.bold}Tezos NFT Toolkit — wallet-write test harness${COLOR.reset}`);
  console.log(`Mode: ${args.mode}    RPC: ${TEZOS_RPC}`);

  const addressA = required("TEZOS_TEST_ADDRESS_A");
  const keyA = process.env.TEZOS_TEST_KEY_A;
  const KEY_B = required("TEZOS_TEST_KEY_B");
  const fa = required("TEZOS_TEST_FA");
  const tokenId = required("TEZOS_TEST_TOKEN_ID");
  const editions = Number(process.env.TEZOS_TEST_EDITIONS ?? "1");

  const walletA = keyA
    ? await makeWalletFromKey(keyA)
    : await makeWalletReadOnly(addressA);
  if (keyA && walletA.address !== addressA) {
    fail(`TEZOS_TEST_KEY_A derives ${walletA.address}, but TEZOS_TEST_ADDRESS_A is ${addressA}.`);
    process.exit(2);
  }
  const walletB = await makeWalletFromKey(KEY_B);

  console.log(`Wallet A: ${walletA.address}  ${walletA.canSign ? "(can sign)" : "(read-only)"}`);
  console.log(`Wallet B: ${walletB.address}  ${walletB.canSign ? "(can sign)" : "(read-only)"}`);
  console.log(`Test token: ${fa}:${tokenId}    Editions hint for A: ${editions}`);

  if (args.mode === "live" && !walletA.canSign) {
    warn(
      "Wallet A is read-only. Tests 1-3 will dry-run even in --live mode. To live-execute them, use the browser at /artist/sale, /artist/offers, /migrate/transfer.",
    );
  }

  const baseCtx: TestContext = { args, fa, tokenId, walletA, walletB };

  const tests: Array<{
    id: number;
    name: string;
    signer: Wallet;
    run: (c: TestContext) => Promise<void>;
  }> = [
    { id: 1, name: "cancel-listing", signer: walletA, run: testCancelListing },
    { id: 2, name: "accept-offer", signer: walletA, run: testAcceptOffer },
    { id: 3, name: "transfer", signer: walletA, run: testTransfer },
    { id: 4, name: "giveaway", signer: walletB, run: testGiveaway },
  ];

  for (const t of tests) {
    if (args.only !== null && args.only !== t.id) continue;

    // If the signer can't sign, we run dry-run regardless of --live.
    const effectiveMode: Args["mode"] =
      args.mode === "live" && !t.signer.canSign ? "dry-run" : args.mode;
    const effectiveArgs: Args = { ...args, mode: effectiveMode };
    const ctx: TestContext = { ...baseCtx, args: effectiveArgs };

    if (args.mode === "live" && effectiveMode === "dry-run") {
      header(`Test ${t.id} — ${t.name}`);
      warn(`Signer is read-only, falling back to dry-run for this test.`);
    }

    try {
      await t.run(ctx);
    } catch (err) {
      fail(`Test ${t.id} (${t.name}) threw: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.stack) dim(err.stack);
    }
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
