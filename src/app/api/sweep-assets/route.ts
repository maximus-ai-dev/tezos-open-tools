import { NextResponse } from "next/server";
import { getAccountTokenBalances } from "@/lib/tzkt";
import { getCreations, getSellerListings, getActiveOperators } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export interface SweepAsset {
  fa: string;
  fa_alias: string | null;
  token_id: string;
  standard: "fa1.2" | "fa2";
  /** "nft" — non-divisible single-edition or low-edition collectible.
   *  "fungible" — divisible token (USDC, DOGA, etc.). */
  kind: "nft" | "fungible";
  name: string | null;
  symbol: string | null;
  decimals: number;
  thumbnail_uri: string | null;
  display_uri: string | null;
  balance: string; // smallest units, as string (some balances exceed Number.MAX_SAFE_INTEGER)
  /** True when the connected wallet is a creator of this token (NFT only). */
  self_minted: boolean;
}

export interface SweepAssetsResult {
  fa12: SweepAsset[];
  fa2_fungibles: SweepAsset[];
  fa2_nfts: SweepAsset[];
  warnings: {
    active_listings: number;
    active_operators: number;
  };
}

function decimalsFrom(v: string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const [balances, creations, listings, operators] = await Promise.all([
    getAccountTokenBalances(address, { limit: 10000 }).catch(() => []),
    getCreations(address, { limit: 5000 }).catch(() => []),
    getSellerListings(address, { limit: 500 }).catch(() => []),
    getActiveOperators(address, { limit: 500 }).catch(() => []),
  ]);

  // Set of (fa:tokenId) the user minted, for self-minted detection.
  const minted = new Set(creations.map((c) => `${c.fa_contract}:${c.token_id}`));

  const fa12: SweepAsset[] = [];
  const fa2Fungibles: SweepAsset[] = [];
  const fa2Nfts: SweepAsset[] = [];

  for (const b of balances) {
    const fa = b.token.contract.address;
    const tokenId = b.token.tokenId;
    const md = b.token.metadata ?? {};
    const decimals = decimalsFrom(md.decimals);
    const standard = b.token.standard === "fa1.2" ? "fa1.2" : "fa2";
    // Heuristic: NFTs have decimals 0. Anything with decimals > 0 is fungible.
    // FA1.2 contracts are always treated as fungibles regardless of decimals.
    const kind: "nft" | "fungible" =
      standard === "fa1.2" ? "fungible" : decimals > 0 ? "fungible" : "nft";
    const key = `${fa}:${tokenId}`;
    const asset: SweepAsset = {
      fa,
      fa_alias: b.token.contract.alias ?? null,
      token_id: tokenId,
      standard,
      kind,
      name: md.name ?? null,
      symbol: md.symbol ?? null,
      decimals,
      thumbnail_uri: md.thumbnailUri ?? null,
      display_uri: md.displayUri ?? null,
      balance: b.balance,
      self_minted: kind === "nft" && minted.has(key),
    };
    if (standard === "fa1.2") fa12.push(asset);
    else if (kind === "fungible") fa2Fungibles.push(asset);
    else fa2Nfts.push(asset);
  }

  const result: SweepAssetsResult = {
    fa12,
    fa2_fungibles: fa2Fungibles,
    fa2_nfts: fa2Nfts,
    warnings: {
      active_listings: listings.length,
      active_operators: operators.length,
    },
  };
  return NextResponse.json(result);
}
