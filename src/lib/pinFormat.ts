// Pure encode/decode for the ?pins= URL parameter.
// Lives outside savedTokens.ts (which is "use client" because it touches
// localStorage) so server components can use it too.

export function encodePinsParam(tokens: Array<{ fa: string; tokenId: string }>): string {
  return tokens.map((t) => `${t.fa}:${t.tokenId}`).join(",");
}

export function decodePinsParam(param: string): Array<{ fa: string; tokenId: string }> {
  if (!param) return [];
  return param
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const idx = piece.indexOf(":");
      if (idx <= 0) return null;
      const fa = piece.slice(0, idx);
      const tokenId = piece.slice(idx + 1);
      if (!/^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(fa)) return null;
      if (!/^\d+$/.test(tokenId)) return null;
      return { fa, tokenId };
    })
    .filter((x): x is { fa: string; tokenId: string } => x !== null);
}
