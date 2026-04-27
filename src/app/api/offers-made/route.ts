import { NextResponse } from "next/server";
import { getOffersMade } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) return NextResponse.json({ offers: [] });
  const offers = await getOffersMade(address, { limit: 200 }).catch(() => []);
  return NextResponse.json({ offers });
}
