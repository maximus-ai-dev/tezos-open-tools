import { NextResponse } from "next/server";
import { getHoldings } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) return NextResponse.json({ holdings: null });
  const result = await getHoldings(address, { limit: 200 }).catch(() => null);
  return NextResponse.json({ holdings: result });
}
