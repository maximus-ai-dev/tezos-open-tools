"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet,
  disconnectWallet,
  getActiveAddress,
} from "@/lib/tezos/wallet";

interface WalletContextValue {
  address: string | null;
  status: "idle" | "connecting" | "connected" | "error";
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletContextValue["status"]>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getActiveAddress().then((addr) => {
      if (cancelled) return;
      if (addr) {
        setAddress(addr);
        setStatus("connected");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const addr = await connectWallet();
      if (addr) {
        setAddress(addr);
        setStatus("connected");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setAddress(null);
    setStatus("idle");
    setError(null);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({ address, status, error, connect, disconnect }),
    [address, status, error, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be called inside <WalletProvider>");
  }
  return ctx;
}
