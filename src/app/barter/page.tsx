import { StubPage } from "@/components/common/StubPage";

export default function BarterPage() {
  return (
    <StubPage
      title="Barter"
      intent="Trade tokens directly with another wallet — propose 'I'll send you X if you send me Y' and execute atomically once both sides agree."
      reason="None of the major Tezos NFT marketplaces (objkt, fxhash, Versum, HEN, Teia) expose a 2-party atomic swap entrypoint where two parties exchange tokens directly without going through a sale. Building this safely needs either deploying our own escrow contract (expensive, ongoing maintenance) or finding a third-party Tezos atomic-swap contract that's been audited."
      manualWorkaround={
        <p>
          For a one-off trade, both parties can use{" "}
          <a className="underline" href="/migrate/transfer">
            Transfer Tokens
          </a>{" "}
          and coordinate via DM — atomicity is on you, but the mechanic works.
        </p>
      }
    />
  );
}
