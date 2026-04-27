"use client";

import { useWallet } from "@/components/wallet/WalletProvider";
import { shortAddress } from "@/lib/utils";

export function ConnectButton() {
  const { address, status, connect, disconnect } = useWallet();

  if (status === "connecting") {
    return (
      <button
        type="button"
        disabled
        className="text-xs px-3 py-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
      >
        Connecting…
      </button>
    );
  }

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 font-mono"
          title={address}
        >
          {shortAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="text-xs px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void connect()}
      className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium"
    >
      Connect wallet
    </button>
  );
}
