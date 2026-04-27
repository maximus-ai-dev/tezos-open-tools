"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { buildFa2BatchTransfer, sendBatch } from "@/lib/tezos/operations";
import { isContractAddress, isTezosAddress, parseTokenInput } from "@/lib/utils";

export default function GiveawayPage() {
  const { address, status, connect } = useWallet();
  const [tokenInput, setTokenInput] = useState("");
  const [recipients, setRecipients] = useState("");
  const [amountEach, setAmountEach] = useState("1");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const parsed = useMemo(() => parseTokenInput(tokenInput), [tokenInput]);

  const recipientList = useMemo(() => {
    return recipients
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [recipients]);

  const validRecipients = recipientList.filter(isTezosAddress);
  const invalidRecipients = recipientList.filter((r) => !isTezosAddress(r));

  async function send() {
    setResult(null);
    if (!address) {
      setResult({ ok: false, message: "Connect your wallet first." });
      return;
    }
    if (!parsed || !isContractAddress(parsed.fa)) {
      setResult({ ok: false, message: "Paste a valid token URL or KT1...:tokenId." });
      return;
    }
    if (validRecipients.length === 0) {
      setResult({ ok: false, message: "Add at least one recipient." });
      return;
    }
    const qty = Number(amountEach);
    if (!Number.isFinite(qty) || qty < 1) {
      setResult({ ok: false, message: "Amount per recipient must be a positive integer." });
      return;
    }
    setBusy(true);
    try {
      const ops = await buildFa2BatchTransfer(
        address,
        validRecipients.map((to) => ({
          fa: parsed.fa,
          tokenId: parsed.tokenId,
          to,
          amount: qty,
        })),
      );
      const { opHash } = await sendBatch(ops);
      setResult({ ok: true, message: opHash });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Giveaway / Airdrop</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Send a single token to many wallets at once — useful for collector giveaways and editions
          drops. All transfers are batched into one operation.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt connect={connect} status={status} />
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Token</label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="objkt URL or KT1...:tokenId"
                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {parsed
                  ? `Resolved: ${parsed.fa.slice(0, 10)}…:${parsed.tokenId}`
                  : tokenInput
                    ? "Could not parse token."
                    : "Paste an objkt.com token URL or use KT1...:id"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Amount sent to each recipient
              </label>
              <input
                type="number"
                min="1"
                value={amountEach}
                onChange={(e) => setAmountEach(e.target.value)}
                className="w-32 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Recipients (one per line, comma- or whitespace-separated)
              </label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                rows={8}
                placeholder="tz1...&#10;tz1...&#10;tz1..."
                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {validRecipients.length} valid
                {invalidRecipients.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    , {invalidRecipients.length} invalid
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy}
              className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
            >
              {busy
                ? "Signing…"
                : `Airdrop to ${validRecipients.length} wallet${validRecipients.length === 1 ? "" : "s"}`}
            </button>
          </div>
          {result && <Result result={result} />}
        </>
      )}
    </div>
  );
}

function ConnectPrompt({
  connect,
  status,
}: {
  connect: () => Promise<void>;
  status: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Connect your wallet to use this tool.</p>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={status === "connecting"}
        className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
      >
        {status === "connecting" ? "Connecting…" : "Connect wallet"}
      </button>
    </div>
  );
}

function Result({ result }: { result: { ok: boolean; message: string } }) {
  return (
    <div
      className={`mt-6 rounded-md p-3 text-sm ${
        result.ok
          ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900"
          : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900"
      }`}
    >
      {result.ok ? (
        <span>
          Sent! Op hash:{" "}
          <a
            href={`https://tzkt.io/${result.message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-mono break-all"
          >
            {result.message}
          </a>
        </span>
      ) : (
        <span>{result.message}</span>
      )}
    </div>
  );
}
