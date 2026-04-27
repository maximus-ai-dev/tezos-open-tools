import { NextResponse } from "next/server";
import { getCreationsByAuthors } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const addresses = (url.searchParams.get("addresses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isTezosAddress);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 120);

  if (addresses.length === 0) {
    return NextResponse.json({ tokens: [] });
  }
  const tokens = await getCreationsByAuthors(addresses, { limit }).catch(() => []);
  return NextResponse.json({ tokens });
}
