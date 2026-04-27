import { NextResponse } from "next/server";
import { getSalesInvolving } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const addresses = (url.searchParams.get("addresses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isTezosAddress);
  const minutes = Math.min(Number(url.searchParams.get("minutes") ?? 720), 1440);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);

  if (addresses.length === 0) {
    return NextResponse.json({ sales: [], fetchedAt: new Date().toISOString() });
  }

  const sales = await getSalesInvolving(addresses, { hours: minutes / 60, limit }).catch(() => []);
  return NextResponse.json({ sales, fetchedAt: new Date().toISOString() });
}
