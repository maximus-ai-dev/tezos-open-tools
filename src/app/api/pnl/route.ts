import { NextResponse } from "next/server";
import { getHoldings, getSalesByBuyer } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export interface PnlRow {
  fa_contract: string;
  token_id: string;
  name: string | null;
  display_uri: string | null;
  thumbnail_uri: string | null;
  fa_name: string | null;
  quantity: number;
  cost_basis_mutez: number | null;
  cost_basis_at: string | null;
  floor_mutez: number | null;
  floor_marketplace: string | null;
  pnl_mutez: number | null;
  pnl_pct: number | null;
}

export interface PnlResult {
  address: string;
  alias: string | null;
  rows: PnlRow[];
  totals: {
    cost: number;
    floor: number;
    pnl: number;
    priced: number;
    unpriced: number;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) return NextResponse.json({ pnl: null });

  const [holdings, sales] = await Promise.all([
    getHoldings(address, { limit: 200 }).catch(() => null),
    getSalesByBuyer(address, { limit: 2000 }).catch(() => []),
  ]);
  if (!holdings) return NextResponse.json({ pnl: null });

  // Most-recent buy price per (fa, token_id). sales are sorted desc, so first wins.
  const lastBuy = new Map<string, { price: number; at: string }>();
  for (const s of sales) {
    if (!s.token) continue;
    const key = `${s.token.fa_contract}:${s.token.token_id}`;
    if (!lastBuy.has(key)) {
      lastBuy.set(key, { price: s.price_xtz ?? s.price, at: s.timestamp });
    }
  }

  const rows: PnlRow[] = holdings.held.map((h) => {
    const key = `${h.token.fa_contract}:${h.token.token_id}`;
    const buy = lastBuy.get(key);
    const cost = buy?.price ?? null;
    const floor = h.token.listings_active[0]?.price ?? null;
    const floorMarket = h.token.listings_active[0]?.marketplace_contract ?? null;
    const pnl = cost !== null && floor !== null ? floor - cost : null;
    const pnlPct = pnl !== null && cost && cost > 0 ? (pnl / cost) * 100 : null;
    return {
      fa_contract: h.token.fa_contract,
      token_id: h.token.token_id,
      name: h.token.name,
      display_uri: h.token.display_uri,
      thumbnail_uri: h.token.thumbnail_uri,
      fa_name: h.token.fa?.name ?? null,
      quantity: h.quantity,
      cost_basis_mutez: cost,
      cost_basis_at: buy?.at ?? null,
      floor_mutez: floor,
      floor_marketplace: floorMarket,
      pnl_mutez: pnl,
      pnl_pct: pnlPct,
    };
  });

  let cost = 0;
  let floor = 0;
  let priced = 0;
  let unpriced = 0;
  for (const r of rows) {
    if (r.cost_basis_mutez !== null && r.floor_mutez !== null) {
      cost += r.cost_basis_mutez;
      floor += r.floor_mutez;
      priced++;
    } else {
      unpriced++;
    }
  }

  const result: PnlResult = {
    address: holdings.address,
    alias: holdings.alias,
    rows,
    totals: { cost, floor, pnl: floor - cost, priced, unpriced },
  };
  return NextResponse.json({ pnl: result });
}
