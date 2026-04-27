"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { buildFa2BatchTransfer, sendBatch } from "@/lib/tezos/operations";
import { isContractAddress, isTezosAddress, parseTokenInput } from "@/lib/utils";

interface Row {
  id: number;
  fa: string;
  tokenId: string;
  amount: string;
  to: string;
}

let nextId = 1;
function newRow(): Row {
  return { id: nextId++, fa: "", tokenId: "", amount: "1", to: "" };
}

export default function TransferTokensPage() {
  const { address, status, connect } = useWallet();
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function pasteTokenInto(id: number, text: string) {
    const parsed = parseTokenInput(text);
    if (parsed) {
      updateRow(id, { fa: parsed.fa, tokenId: parsed.tokenId });
    }
  }

  function validate(): { ok: boolean; reason?: string } {
    for (const r of rows) {
      if (!r.fa || !r.tokenId || !r.to) {
        return { ok: false, reason: "Fill in every row." };
      }
      if (!isContractAddress(r.fa)) return { ok: false, reason: `Bad contract: ${r.fa}` };
      if (!/^\d+$/.test(r.tokenId)) return { ok: false, reason: `Bad token id: ${r.tokenId}` };
      if (!isTezosAddress(r.to)) return { ok: false, reason: `Bad destination: ${r.to}` };
      const n = Number(r.amount);
      if (!Number.isFinite(n) || n < 1) return { ok: false, reason: `Bad amount: ${r.amount}` };
    }
    return { ok: true };
  }

  async function send() {
    setResult(null);
    if (!address) {
      setResult({ ok: false, message: "Connect your wallet first." });
      return;
    }
    const v = validate();
    if (!v.ok) {
      setResult({ ok: false, message: v.reason ?? "Invalid input" });
      return;
    }
    setBusy(true);
    try {
      const ops = await buildFa2BatchTransfer(
        address,
        rows.map((r) => ({
          fa: r.fa,
          tokenId: r.tokenId,
          to: r.to,
          amount: Number(r.amount),
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Transfer Tokens</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Send NFTs you own to another wallet. Multiple transfers are batched into one operation.
        </p>
      </header>

      {!address ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Connect your wallet to use this tool.
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
          <div className="space-y-3">
            {rows.map((r) => (
              <RowInputs
                key={r.id}
                row={r}
                onChange={(patch) => updateRow(r.id, patch)}
                onPasteToken={(text) => pasteTokenInto(r.id, text)}
                onRemove={() =>
                  setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs))
                }
                canRemove={rows.length > 1}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, newRow()])}
              className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              + Add row
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy}
              className="px-4 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Signing…" : `Send ${rows.length} transfer${rows.length > 1 ? "s" : ""}`}
            </button>
          </div>
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
          )}
        </>
      )}
    </div>
  );
}

function RowInputs({
  row,
  onChange,
  onPasteToken,
  onRemove,
  canRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onPasteToken: (text: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const tokenSummary = row.fa && row.tokenId ? `${row.fa.slice(0, 8)}…:${row.tokenId}` : "(empty)";
  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 text-sm">
      <div className="sm:col-span-5">
        <label className="block text-xs text-zinc-500 mb-1">Token (paste objkt URL or KT1:id)</label>
        <input
          type="text"
          value={`${row.fa}${row.fa && row.tokenId ? ":" : ""}${row.tokenId}`}
          onChange={(e) => onPasteToken(e.target.value)}
          placeholder="objkt URL or KT1...:id"
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 font-mono text-xs"
        />
        <p className="mt-1 text-[10px] text-zinc-500">Resolves to {tokenSummary}</p>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs text-zinc-500 mb-1">Amount</label>
        <input
          type="number"
          min="1"
          value={row.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1"
        />
      </div>
      <div className="sm:col-span-4">
        <label className="block text-xs text-zinc-500 mb-1">Destination</label>
        <input
          type="text"
          value={row.to}
          onChange={(e) => onChange({ to: e.target.value })}
          placeholder="tz1..."
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 font-mono text-xs"
        />
      </div>
      <div className="sm:col-span-1 flex items-end">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="w-full text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40"
          title="Remove row"
        >
          ×
        </button>
      </div>
    </div>
  );
}
