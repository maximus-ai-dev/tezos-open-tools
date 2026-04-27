import { NextResponse } from "next/server";
import { getRecentSales } from "@/lib/objkt";
import { FXHASH_MARKETPLACE_CONTRACTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fxhashOnly = url.searchParams.get("fxhash") === "1";
  const minutes = Math.min(Number(url.searchParams.get("minutes") ?? 60), 1440);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const sales = await getRecentSales({ hours: minutes / 60, limit }).catch(() => []);
  const filtered = fxhashOnly
    ? sales.filter((s) => FXHASH_MARKETPLACE_CONTRACTS.has(s.marketplace_contract))
    : sales;

  return NextResponse.json({ sales: filtered, fetchedAt: new Date().toISOString() });
}
