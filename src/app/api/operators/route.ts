import { NextResponse } from "next/server";
import { getActiveOperators } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) return NextResponse.json({ grants: [] });
  const grants = await getActiveOperators(address, { limit: 500 }).catch(() => []);
  return NextResponse.json({ grants });
}
