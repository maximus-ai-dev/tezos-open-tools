import { NextResponse } from "next/server";
import { getHoldings, getSalesByBuyer, getSalesBySeller } from "@/lib/objkt";
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
  /** Floor is >100× cost (e.g. artist set absurd "make-offer-only" BIN). Excluded from totals. */
  bin_trap: boolean;
}

export interface RealizedRow {
  fa_contract: string;
  token_id: string;
  name: string | null;
  display_uri: string | null;
  thumbnail_uri: string | null;
  fa_name: string | null;
  sold_at: string;
  sold_for_mutez: number;
  cost_basis_mutez: number | null;
  cost_basis_at: string | null;
  realized_mutez: number | null;
  realized_pct: number | null;
}

export interface PnlResult {
  address: string;
  alias: string | null;
  rows: PnlRow[];
  realized: RealizedRow[];
  totals: {
    cost: number;
    floor: number;
    pnl: number;
    priced: number;
    unpriced: number;
    bin_traps: number;
  };
  realized_totals: {
    cost: number;
    proceeds: number;
    pnl: number;
    matched: number;
    unmatched: number;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) return NextResponse.json({ pnl: null });

  const [holdings, buys, sells] = await Promise.all([
    getHoldings(address, { limit: 200 }).catch(() => null),
    getSalesByBuyer(address, { limit: 2000 }).catch(() => []),
    getSalesBySeller(address, { limit: 2000 }).catch(() => []),
  ]);
  if (!holdings) return NextResponse.json({ pnl: null });

  // Most-recent buy price per (fa, token_id) — for unrealized cost basis.
  // buys are sorted desc, so first wins.
  const lastBuy = new Map<string, { price: number; at: string }>();
  for (const s of buys) {
    if (!s.token || s.price_xtz === null) continue;
    const key = `${s.token.fa_contract}:${s.token.token_id}`;
    if (!lastBuy.has(key)) {
      lastBuy.set(key, { price: s.price_xtz, at: s.timestamp });
    }
  }

  // For realized P&L we need the buy that happened *before* each sell.
  // Group buys by token, oldest first; consume one per matching sale (FIFO).
  const buysByToken = new Map<string, Array<{ price: number; at: string }>>();
  // Sort ascending so we can shift() the oldest first.
  const buysAsc = [...buys].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
  );
  for (const s of buysAsc) {
    if (!s.token || s.price_xtz === null) continue;
    const key = `${s.token.fa_contract}:${s.token.token_id}`;
    const arr = buysByToken.get(key) ?? [];
    arr.push({ price: s.price_xtz, at: s.timestamp });
    buysByToken.set(key, arr);
  }

  // Walk sells oldest→newest so FIFO actually maps the right buys.
  const sellsAsc = [...sells].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
  );
  const realized: RealizedRow[] = [];
  for (const s of sellsAsc) {
    if (!s.token || s.price_xtz === null) continue;
    const key = `${s.token.fa_contract}:${s.token.token_id}`;
    const queue = buysByToken.get(key);
    let cost: { price: number; at: string } | undefined;
    while (queue && queue.length > 0) {
      const head = queue[0]!;
      if (head.at <= s.timestamp) {
        cost = queue.shift();
        break;
      } else {
        // No buy strictly before this sale — this sale is for a token they minted/gifted.
        break;
      }
    }
    const sold = s.price_xtz;
    const r = cost ? sold - cost.price : null;
    realized.push({
      fa_contract: s.token.fa_contract,
      token_id: s.token.token_id,
      name: s.token.name,
      display_uri: s.token.display_uri,
      thumbnail_uri: s.token.thumbnail_uri,
      fa_name: s.token.fa?.name ?? null,
      sold_at: s.timestamp,
      sold_for_mutez: sold,
      cost_basis_mutez: cost?.price ?? null,
      cost_basis_at: cost?.at ?? null,
      realized_mutez: r,
      realized_pct: r !== null && cost && cost.price > 0 ? (r / cost.price) * 100 : null,
    });
  }
  realized.reverse(); // newest first for display

  const rows: PnlRow[] = holdings.held.map((h) => {
    const key = `${h.token.fa_contract}:${h.token.token_id}`;
    const buy = lastBuy.get(key);
    const cost = buy?.price ?? null;
    const floor = h.token.listings_active[0]?.price ?? null;
    const floorMarket = h.token.listings_active[0]?.marketplace_contract ?? null;
    const pnl = cost !== null && floor !== null ? floor - cost : null;
    const pnlPct = pnl !== null && cost && cost > 0 ? (pnl / cost) * 100 : null;
    // BIN trap: floor >100× cost basis. Almost always an artist's "make-offer-only"
    // sky-high BIN listing — keeps the row visible but excludes from totals so a single
    // 2,000,000 ꜩ listing doesn't dominate a portfolio summary.
    const binTrap = cost !== null && cost > 0 && floor !== null && floor > cost * 100;
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
      bin_trap: binTrap,
    };
  });

  let cost = 0;
  let floor = 0;
  let priced = 0;
  let unpriced = 0;
  let binTraps = 0;
  for (const r of rows) {
    if (r.cost_basis_mutez !== null && r.floor_mutez !== null) {
      if (r.bin_trap) {
        binTraps++;
        continue;
      }
      cost += r.cost_basis_mutez;
      floor += r.floor_mutez;
      priced++;
    } else {
      unpriced++;
    }
  }

  let rCost = 0;
  let rProceeds = 0;
  let rMatched = 0;
  let rUnmatched = 0;
  for (const r of realized) {
    if (r.cost_basis_mutez !== null) {
      rCost += r.cost_basis_mutez;
      rProceeds += r.sold_for_mutez;
      rMatched++;
    } else {
      rUnmatched++;
    }
  }

  const result: PnlResult = {
    address: holdings.address,
    alias: holdings.alias,
    rows,
    realized,
    totals: { cost, floor, pnl: floor - cost, priced, unpriced, bin_traps: binTraps },
    realized_totals: {
      cost: rCost,
      proceeds: rProceeds,
      pnl: rProceeds - rCost,
      matched: rMatched,
      unmatched: rUnmatched,
    },
  };
  return NextResponse.json({ pnl: result });
}
