"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { buildBuyBatch, isBuyable, sendBatch } from "@/lib/tezos/operations";
import { MARKETPLACE_NAMES } from "@/lib/constants";
import { formatTez } from "@/lib/utils";

interface BuyButtonProps {
  /** the marketplace contract address (e.g. objkt v6.2) */
  marketplaceContract: string;
  /** the listing's bigmap_key (a.k.a. ask_id) */
  askId: number;
  /** price per edition in mutez */
  priceMutez: number;
  /** editions available */
  amountAvailable: number;
  /** for the confirmation dialog body */
  tokenName?: string | null;
  /** small button (used inline on cards) vs full-width (used on detail pages) */
  variant?: "compact" | "full";
}

export function BuyButton({
  marketplaceContract,
  askId,
  priceMutez,
  amountAvailable,
  tokenName,
  variant = "compact",
}: BuyButtonProps) {
  const { address, status, connect } = useWallet();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [quantity, setQuantity] = useState(1);

  const supported = isBuyable(marketplaceContract);

  if (!supported) {
    return null;
  }

  const safeQty = Math.max(1, Math.min(amountAvailable, Math.floor(quantity)));
  const totalMutez = priceMutez * safeQty;

  async function buy() {
    setConfirmOpen(false);
    if (!address) {
      setResult({ ok: false, message: "Connect wallet first" });
      return;
    }
    setBusy(true);
    try {
      const ops = await buildBuyBatch(address, [
        { marketplaceContract, askId, amount: safeQty, priceMutez },
      ]);
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

  if (!address) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          void connect();
        }}
        disabled={status === "connecting"}
        className={
          variant === "compact"
            ? "text-[11px] px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            : "px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
        }
      >
        Connect to buy
      </button>
    );
  }

  const className =
    variant === "compact"
      ? "text-[11px] px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
      : "px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setConfirmOpen(true);
        }}
        disabled={busy}
        className={className}
      >
        {busy ? "Signing…" : `Buy ${formatTez(priceMutez)}`}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm purchase"
        confirmLabel={
          safeQty === 1
            ? `Buy for ${formatTez(priceMutez)}`
            : `Buy ${safeQty} for ${formatTez(totalMutez)}`
        }
        tone="default"
        busy={busy}
        onConfirm={() => void buy()}
        onCancel={() => setConfirmOpen(false)}
        warning={
          <>
            You&apos;ll send <strong>{formatTez(totalMutez)}</strong> to the marketplace, plus a few
            mutez for gas. {safeQty === 1 ? "The token transfers" : `${safeQty} editions transfer`}{" "}
            to your wallet on confirmation.
          </>
        }
      >
        <ul className="space-y-1 text-sm">
          <li>
            <strong>Token:</strong> {tokenName ?? `(unnamed, ask_id ${askId})`}
          </li>
          <li>
            <strong>Marketplace:</strong> {MARKETPLACE_NAMES[marketplaceContract] ?? marketplaceContract}
          </li>
          <li>
            <strong>Listing #:</strong> {askId}
          </li>
          <li>
            <strong>Available:</strong> {amountAvailable} edition{amountAvailable === 1 ? "" : "s"}
          </li>
          <li>
            <strong>Price each:</strong> {formatTez(priceMutez)}
          </li>
        </ul>
        {amountAvailable > 1 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <label htmlFor="buy-qty" className="text-zinc-700 dark:text-zinc-300">
              Quantity:
            </label>
            <input
              id="buy-qty"
              type="number"
              min={1}
              max={amountAvailable}
              value={quantity}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setQuantity(Number.isFinite(n) ? n : 1);
              }}
              className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm"
            />
            <span className="text-xs text-zinc-500">
              total {formatTez(totalMutez)}
            </span>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Beacon will show the operation params again before final signing. The referral fee on this
          purchase routes to the deployment&apos;s configured wallet (see{" "}
          <code className="font-mono">REFERRAL_WALLET</code> in src/lib/constants.ts).
        </p>
      </ConfirmDialog>

      {result && (
        <div
          className={`mt-2 text-[10px] ${result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {result.ok ? (
            <a
              href={`https://tzkt.io/${result.message}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ✓ Sent — view on tzkt
            </a>
          ) : (
            result.message
          )}
        </div>
      )}
    </>
  );
}
