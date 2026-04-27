import { NextResponse } from "next/server";
import { getOperationsByTarget } from "@/lib/tzkt";
import { isContractAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("target") ?? "";
  if (!isContractAddress(target)) {
    return NextResponse.json({ ops: [] });
  }
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);
  const ops = await getOperationsByTarget(target, { limit }).catch(() => []);
  return NextResponse.json({ ops });
}
