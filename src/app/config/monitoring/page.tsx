"use client";

import { useEffect, useState } from "react";
import {
  addSavedAddress,
  getSavedAddresses,
  removeSavedAddress,
  updateSavedAddress,
  type SavedAddress,
} from "@/lib/savedAddresses";
import { useWallet } from "@/components/wallet/WalletProvider";
import { isTezosAddress, shortAddress, formatDate } from "@/lib/utils";
import { objktProfileLink } from "@/lib/constants";

export default function MonitoringConfigPage() {
  const { address: connected } = useWallet();
  const [list, setList] = useState<SavedAddress[]>([]);
  const [pendingAddr, setPendingAddr] = useState("");
  const [pendingLabel, setPendingLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList(getSavedAddresses());
  }, []);

  function add() {
    setError(null);
    const addr = pendingAddr.trim();
    if (!isTezosAddress(addr)) {
      setError("Not a valid Tezos address.");
      return;
    }
    setList(addSavedAddress(addr, pendingLabel.trim() || undefined));
    setPendingAddr("");
    setPendingLabel("");
  }

  function remove(addr: string) {
    setList(removeSavedAddress(addr));
  }

  function relabel(addr: string, label: string) {
    setList(updateSavedAddress(addr, label));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Monitoring Config</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Wallets you want to follow. Used by{" "}
          <a className="underline" href="/follow">
            /follow
          </a>{" "}
          and{" "}
          <a className="underline" href="/artist/follow">
            /artist/follow
          </a>
          . Stored in this browser only — nothing leaves your device.
        </p>
      </header>

      <section className="space-y-3 mb-8 rounded-md border border-zinc-200 dark:border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Add wallet</h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={pendingAddr}
            onChange={(e) => setPendingAddr(e.target.value)}
            placeholder="tz1... or tz2... wallet address"
            className="sm:col-span-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
          />
          <input
            type="text"
            value={pendingLabel}
            onChange={(e) => setPendingLabel(e.target.value)}
            placeholder="label (optional)"
            className="sm:col-span-3 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={add}
            className="sm:col-span-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            Add
          </button>
        </div>
        {connected && !list.some((s) => s.address === connected) && (
          <button
            type="button"
            onClick={() => {
              setList(addSavedAddress(connected));
            }}
            className="text-xs text-zinc-600 dark:text-zinc-400 underline"
          >
            Add my connected wallet ({shortAddress(connected)})
          </button>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          Saved wallets ({list.length})
        </h2>
        {list.length === 0 ? (
          <p className="text-sm text-zinc-500">No wallets saved yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-800">
            {list.map((s) => (
              <li
                key={s.address}
                className="px-3 py-2 flex items-center gap-3 text-sm"
              >
                <input
                  type="text"
                  defaultValue={s.label ?? ""}
                  placeholder="(no label)"
                  onBlur={(e) => relabel(s.address, e.target.value)}
                  className="flex-1 max-w-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm"
                />
                <a
                  href={objktProfileLink(s.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-500 hover:underline"
                  title={s.address}
                >
                  {shortAddress(s.address)}
                </a>
                <span className="text-xs text-zinc-400">{formatDate(new Date(s.addedAt).toISOString())}</span>
                <button
                  type="button"
                  onClick={() => remove(s.address)}
                  className="ml-auto text-xs px-2 py-1 rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
