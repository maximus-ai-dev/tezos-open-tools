"use client";

import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit } from "@taquito/taquito";

export const TEZOS_RPC = "https://mainnet.tezos.ecadinfra.com";

let wallet: BeaconWallet | null = null;
let tezos: TezosToolkit | null = null;

export function getTezos(): TezosToolkit {
  if (!tezos) {
    tezos = new TezosToolkit(TEZOS_RPC);
  }
  return tezos;
}

export function getWallet(): BeaconWallet {
  if (typeof window === "undefined") {
    throw new Error("getWallet() may only be called in the browser.");
  }
  if (!wallet) {
    // Beacon defaults to mainnet when preferredNetwork isn't set.
    wallet = new BeaconWallet({ name: "Tezos Open Tools" });
    getTezos().setWalletProvider(wallet);
  }
  return wallet;
}

export async function getActiveAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const account = await getWallet().client.getActiveAccount();
    return account?.address ?? null;
  } catch {
    return null;
  }
}

export async function connectWallet(): Promise<string | null> {
  const w = getWallet();
  await w.requestPermissions();
  return getActiveAddress();
}

export async function disconnectWallet(): Promise<void> {
  if (typeof window === "undefined") return;
  const w = getWallet();
  // Newer BeaconWallet exposes disconnect(); fall back to client.clearActiveAccount().
  if (typeof (w as unknown as { disconnect?: () => Promise<void> }).disconnect === "function") {
    await (w as unknown as { disconnect: () => Promise<void> }).disconnect();
  } else {
    await w.client.clearActiveAccount();
  }
}
