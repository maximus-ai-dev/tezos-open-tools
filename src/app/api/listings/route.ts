import { NextResponse } from "next/server";
import { getSellerListings } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) {
    return NextResponse.json({ listings: [] });
  }
  const listings = await getSellerListings(address, { limit: 200 }).catch(() => []);
  return NextResponse.json({ listings });
}
