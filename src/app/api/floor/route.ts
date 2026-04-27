import { NextResponse } from "next/server";
import { getFaFloor } from "@/lib/objkt";
import { isContractAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fa = url.searchParams.get("fa") ?? "";
  if (!isContractAddress(fa)) return NextResponse.json({ listings: [] });
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 200);
  const listings = await getFaFloor(fa, { limit }).catch(() => []);
  return NextResponse.json({ listings });
}
