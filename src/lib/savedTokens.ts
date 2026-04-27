"use client";

// Per-wallet pinned token sets, stored in localStorage. Pinning is local-only:
// only this browser, signed in as this wallet, sees the pin order. To share a
// curated view, the user can encode their pin list into a URL — see /flex.
// On-chain pin storage is a future upgrade (would need contract origination),
// keeping the same on-disk shape so a migration path is clean.

const KEY_PREFIX = "ttk:pinnedTokens:";

export interface PinnedToken {
  fa: string;
  tokenId: string;
  pinnedAt: number;
}

function key(walletAddress: string): string {
  return KEY_PREFIX + walletAddress;
}

export function getPinnedTokens(walletAddress: string): PinnedToken[] {
  if (typeof window === "undefined" || !walletAddress) return [];
  try {
    const raw = window.localStorage.getItem(key(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is PinnedToken =>
        typeof x === "object" &&
        x !== null &&
        typeof x.fa === "string" &&
        typeof x.tokenId === "string",
    );
  } catch {
    return [];
  }
}

export function isPinned(walletAddress: string, fa: string, tokenId: string): boolean {
  return getPinnedTokens(walletAddress).some(
    (t) => t.fa === fa && t.tokenId === tokenId,
  );
}

export function pinToken(
  walletAddress: string,
  fa: string,
  tokenId: string,
): PinnedToken[] {
  if (typeof window === "undefined" || !walletAddress) return [];
  const current = getPinnedTokens(walletAddress);
  if (current.some((t) => t.fa === fa && t.tokenId === tokenId)) return current;
  const next = [...current, { fa, tokenId, pinnedAt: Date.now() }];
  window.localStorage.setItem(key(walletAddress), JSON.stringify(next));
  return next;
}

export function unpinToken(
  walletAddress: string,
  fa: string,
  tokenId: string,
): PinnedToken[] {
  if (typeof window === "undefined" || !walletAddress) return [];
  const next = getPinnedTokens(walletAddress).filter(
    (t) => !(t.fa === fa && t.tokenId === tokenId),
  );
  window.localStorage.setItem(key(walletAddress), JSON.stringify(next));
  return next;
}

export function clearPinnedTokens(walletAddress: string): void {
  if (typeof window === "undefined" || !walletAddress) return;
  window.localStorage.removeItem(key(walletAddress));
}

// Pure encode/decode helpers live in lib/pinFormat.ts so server components
// can use them too — re-export here for convenience.
export { encodePinsParam, decodePinsParam } from "./pinFormat";
