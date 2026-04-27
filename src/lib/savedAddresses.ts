"use client";

const KEY = "ttk:savedAddresses";

export interface SavedAddress {
  address: string;
  label?: string;
  addedAt: number;
}

export function getSavedAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is SavedAddress =>
      typeof x === "object" && x !== null && typeof x.address === "string",
    );
  } catch {
    return [];
  }
}

export function saveAddresses(list: SavedAddress[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function addSavedAddress(address: string, label?: string): SavedAddress[] {
  const current = getSavedAddresses();
  if (current.some((s) => s.address === address)) return current;
  const next = [...current, { address, label, addedAt: Date.now() }];
  saveAddresses(next);
  return next;
}

export function removeSavedAddress(address: string): SavedAddress[] {
  const next = getSavedAddresses().filter((s) => s.address !== address);
  saveAddresses(next);
  return next;
}

export function updateSavedAddress(address: string, label: string): SavedAddress[] {
  const next = getSavedAddresses().map((s) => (s.address === address ? { ...s, label } : s));
  saveAddresses(next);
  return next;
}
