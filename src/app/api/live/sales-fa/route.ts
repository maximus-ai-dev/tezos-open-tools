import { NextResponse } from "next/server";
import { getRecentSalesForFas } from "@/lib/objkt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fas = (url.searchParams.get("fas") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(s));
  const minutes = Math.min(Number(url.searchParams.get("minutes") ?? 360), 1440);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);

  if (fas.length === 0) {
    return NextResponse.json({ sales: [], fetchedAt: new Date().toISOString() });
  }

  const sales = await getRecentSalesForFas(fas, { hours: minutes / 60, limit }).catch(() => []);
  return NextResponse.json({ sales, fetchedAt: new Date().toISOString() });
}
