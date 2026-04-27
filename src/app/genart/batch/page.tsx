import { StubPage } from "@/components/common/StubPage";

export default function GenartBatchPage() {
  return (
    <StubPage
      title="Genart Batch Mint"
      intent="Mint many iterations of an open generative-art project (fxhash, etc.) in a single batched transaction — useful when you want N iterations without N separate signing prompts."
      reason="fxhash v1 and v2 issuer contracts have been inactive since 2022 — no recent mints. Current fxhash mints route through a signer module that wraps per-project contracts in v3, with mint signatures generated server-side. Reverse-engineering this safely requires watching a live fxhash mint and tracing the operation to find the user-callable entrypoint."
      manualWorkaround={
        <p>
          Mint iterations one at a time on{" "}
          <a className="underline" href="https://www.fxhash.xyz" target="_blank" rel="noopener noreferrer">
            fxhash.xyz
          </a>
          .
        </p>
      }
    />
  );
}
