import { NextResponse } from "next/server";
import { getAccountOps } from "@/lib/tzkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isTezosAddress(address)) return NextResponse.json({ ops: [] });
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 100);
  const ops = await getAccountOps(address, { limit }).catch(() => []);
  return NextResponse.json({ ops });
}
