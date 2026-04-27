"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { isTezosAddress } from "@/lib/utils";

interface WalletInputFormProps {
  action: string;
  initial?: string;
  paramName?: string;
  placeholder?: string;
  buttonLabel?: string;
}

export function WalletInputForm({
  action,
  initial = "",
  paramName = "address",
  placeholder = "tz1... wallet address",
  buttonLabel = "Look up",
}: WalletInputFormProps) {
  const { address: connected } = useWallet();
  const [value, setValue] = useState(initial);

  // Show a one-click "use connected wallet" button only when:
  //   - a wallet is connected
  //   - the field is empty (don't override what the user typed or the URL set)
  //   - the field expects a wallet address (not a contract — we use paramName as a heuristic)
  const showUseConnected = !!connected && !value && paramName === "address";

  function useConnected() {
    if (connected) setValue(connected);
  }

  return (
    <form method="GET" action={action} className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          name={paramName}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {showUseConnected && (
          <button
            type="button"
            onClick={useConnected}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            use connected
          </button>
        )}
      </div>
      <button
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        {buttonLabel}
      </button>
      {connected &&
        value &&
        isTezosAddress(value) &&
        value !== connected &&
        paramName === "address" && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 self-center sm:ml-2">
            (looking up a different wallet from your connected one)
          </span>
        )}
    </form>
  );
}
