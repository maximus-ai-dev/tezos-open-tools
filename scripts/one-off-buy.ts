/**
 * One-off live test: use the burner to buy a specific cheap listing on objkt v6.2.
 * Dry-runs first, then prompts before live broadcast.
 */
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { buildBuyBatch } from "./lib/nodeOps";
import { REFERRAL_WALLET } from "../src/lib/constants";

const KEY = "edsk2r8TmsWGLC2xziPLpzSsXMHEQZfYhAHqUgx2hs98SP5aobGBKj";
const ASK_ID = 12451936;
const PRICE_MUTEZ = 100_000;
const MARKETPLACE = "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X";
const RPC = "https://mainnet.tezos.ecadinfra.com";

async function main() {
  const live = process.argv.includes("--live");
  const tezos = new TezosToolkit(RPC);
  const signer = new InMemorySigner(KEY);
  tezos.setProvider({ signer });
  const buyer = await signer.publicKeyHash();
  console.log("buyer:", buyer);
  console.log("referral:", REFERRAL_WALLET);
  console.log("ask:", ASK_ID, "price:", PRICE_MUTEZ / 1e6, "ꜩ", "marketplace:", MARKETPLACE);

  const ops = await buildBuyBatch(
    tezos,
    buyer,
    [{ marketplaceContract: MARKETPLACE, askId: ASK_ID, amount: 1, priceMutez: PRICE_MUTEZ }],
    REFERRAL_WALLET,
  );
  console.log("built ops:", ops.length);

  console.log("\n=== dry-run estimate ===");
  const ests = await tezos.estimate.batch(ops);
  const gas = ests.reduce((s, e) => s + e.gasLimit, 0);
  const fee = ests.reduce((s, e) => s + e.suggestedFeeMutez, 0);
  console.log("  estimated gas:", gas);
  console.log("  estimated fee:", fee / 1e6, "ꜩ");
  console.log("✓ RPC says this would succeed");

  if (!live) {
    console.log("\n(pass --live to actually broadcast)");
    return;
  }

  console.log("\n=== broadcasting LIVE ===");
  const before = (await tezos.tz.getBalance(buyer)).toNumber();
  const op = await tezos.contract.batch(ops).send();
  console.log("  op hash:", op.hash);
  console.log("  → https://tzkt.io/" + op.hash);
  console.log("  waiting for confirmation...");
  await op.confirmation(1);
  const after = (await tezos.tz.getBalance(buyer)).toNumber();
  console.log("  balance: ", before / 1e6, "→", after / 1e6, "ꜩ");
  console.log("  spent (price + fees):", (before - after) / 1e6, "ꜩ");
  console.log("✓ live buy succeeded");
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
