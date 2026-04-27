"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";

const STORAGE_KEYS = {
  defaultAddress: "ttk:defaultAddress",
} as const;

export default function SettingsPage() {
  const { address } = useWallet();
  const [defaultAddress, setDefaultAddress] = useState<string>("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(STORAGE_KEYS.defaultAddress);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v) setDefaultAddress(v);
  }, []);

  function save() {
    if (typeof window === "undefined") return;
    if (defaultAddress) {
      window.localStorage.setItem(STORAGE_KEYS.defaultAddress, defaultAddress);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.defaultAddress);
    }
    setSaved("Saved.");
    setTimeout(() => setSaved(null), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Local preferences for this browser. Nothing is sent to a server.
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Default wallet address
          </label>
          <p className="text-xs text-zinc-500 mb-2">
            Pre-fills wallet address fields across the toolkit (e.g. /resale, /artist).
          </p>
          <input
            type="text"
            value={defaultAddress}
            onChange={(e) => setDefaultAddress(e.target.value)}
            placeholder="tz1..."
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm font-medium hover:opacity-90"
            >
              Save
            </button>
            {address && address !== defaultAddress && (
              <button
                type="button"
                onClick={() => setDefaultAddress(address)}
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Use connected wallet
              </button>
            )}
            {saved && <span className="text-xs text-green-600 dark:text-green-400">{saved}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
