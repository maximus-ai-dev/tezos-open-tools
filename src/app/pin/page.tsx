import { StubPage } from "@/components/common/StubPage";

export default function PinPage() {
  return (
    <StubPage
      title="Pin Your Art"
      intent="Choose tokens you minted to feature prominently on your objkt profile (the 'pinned' tab on objkt.com)."
      reason="objkt's profile pinning appears to be stored server-side as a preference, not as a smart contract action — there's no on-chain entrypoint that updates 'featured tokens'. This would need objkt's profile API (which isn't documented) or a different approach such as our own pinning contract."
      manualWorkaround={
        <p>
          Pin tokens directly via{" "}
          <a className="underline" href="https://objkt.com" target="_blank" rel="noopener noreferrer">
            objkt.com
          </a>{" "}
          → your profile → edit → featured.
        </p>
      }
    />
  );
}
