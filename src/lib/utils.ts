export function mutezToTez(mutez: string | number | bigint | null | undefined): number {
  if (mutez === null || mutez === undefined) return 0;
  const n = typeof mutez === "bigint" ? Number(mutez) : Number(mutez);
  return n / 1_000_000;
}

export function formatTez(mutez: string | number | bigint | null | undefined, decimals = 2): string {
  const tez = mutezToTez(mutez);
  return `${tez.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ꜩ`;
}

export function shortAddress(addr: string | null | undefined, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ipfsToHttp(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}

const TZ_ADDR = /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/;
export function isTezosAddress(s: string): boolean {
  return TZ_ADDR.test(s.trim());
}
export function isContractAddress(s: string): boolean {
  return /^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());
}

export function parseContractInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isContractAddress(trimmed)) return trimmed;
  const urlMatch = trimmed.match(/objkt\.com\/(?:collections|collection|tokens)\/(KT1[1-9A-HJ-NP-Za-km-z]{33})/i);
  if (urlMatch) return urlMatch[1];
  return null;
}

export function parseTokenInput(input: string): { fa: string; tokenId: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/objkt\.com\/(?:tokens|asset)\/([^/?#]+)\/(\d+)/i);
  if (urlMatch) return { fa: urlMatch[1], tokenId: urlMatch[2] };

  const colonMatch = trimmed.match(/^(KT1[1-9A-HJ-NP-Za-km-z]{33})[:\s]+(\d+)$/);
  if (colonMatch) return { fa: colonMatch[1], tokenId: colonMatch[2] };

  return null;
}
