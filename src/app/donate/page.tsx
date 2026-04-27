"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getTezos } from "@/lib/tezos/wallet";
import { DONATION_WALLET, GITHUB_URL } from "@/lib/constants";
import { formatTez, shortAddress } from "@/lib/utils";

const PRESETS_MUTEZ = [1_000_000, 5_000_000, 10_000_000];

export default function DonatePage() {
  const { address, status, connect } = useWallet();
  const [selected, setSelected] = useState<number>(PRESETS_MUTEZ[0]!);
  const [customStr, setCustomStr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const customMutez = (() => {
    const n = Number(customStr);
    if (!customStr || Number.isNaN(n) || n <= 0) return null;
    return Math.round(n * 1_000_000);
  })();

  const amountMutez = customMutez ?? selected;
  const ready = address && amountMutez > 0;

  async function send() {
    setConfirmOpen(false);
    if (!ready) return;
    setBusy(true);
    setResult(null);
    try {
      const tezos = getTezos();
      const op = await tezos.wallet
        .transfer({ to: DONATION_WALLET, amount: amountMutez, mutez: true })
        .send();
      setResult({ ok: true, message: op.opHash });
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tip jar</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This toolkit is free and{" "}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            open source
          </a>
          . If it&apos;s saved you time, a small tip helps cover hosting and the time spent
          shipping new features. Optional, never required.
        </p>
      </header>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Goes to</div>
        <a
          href={`https://tzkt.io/${DONATION_WALLET}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm hover:underline break-all"
        >
          {DONATION_WALLET}
        </a>
        <p className="mt-2 text-xs text-zinc-500">
          (Same address that receives objkt referral fees from the Floor Sweep tool — view its
          balance and history on tzkt.)
        </p>
      </div>

      {!address ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Connect your wallet to send a tip via Beacon.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={status === "connecting"}
            className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {status === "connecting" ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Amount</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {PRESETS_MUTEZ.map((m) => {
                const active = !customStr && selected === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelected(m);
                      setCustomStr("");
                    }}
                    className={`rounded-md px-4 py-3 text-sm font-medium border transition-colors ${
                      active
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {formatTez(m)}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min="0"
              step="0.000001"
              value={customStr}
              onChange={(e) => setCustomStr(e.target.value)}
              placeholder="Custom amount in ꜩ"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!ready || busy}
            className="w-full px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy
              ? "Signing…"
              : ready
                ? `Send ${formatTez(amountMutez)} tip`
                : "Pick an amount"}
          </button>

          <p className="mt-3 text-xs text-zinc-500 text-center">
            From {shortAddress(address)} → {shortAddress(DONATION_WALLET)}
          </p>
        </>
      )}

      {result && (
        <div
          className={`mt-4 rounded-md p-3 text-sm ${
            result.ok
              ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900"
          }`}
        >
          {result.ok ? (
            <span>
              Thank you! Op:{" "}
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
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Send ${formatTez(amountMutez)} tip?`}
        confirmLabel={`Sign — send ${formatTez(amountMutez)}`}
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p className="text-sm">
          Sending <strong>{formatTez(amountMutez)}</strong> to{" "}
          <span className="font-mono text-xs break-all">{DONATION_WALLET}</span>.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Beacon will show the operation params again before final signing.
        </p>
      </ConfirmDialog>
    </div>
  );
}
