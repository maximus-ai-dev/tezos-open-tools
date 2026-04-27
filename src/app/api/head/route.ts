import { NextResponse } from "next/server";
import { getHead, getRecentBlocks } from "@/lib/tzkt";

export const dynamic = "force-dynamic";

export async function GET() {
  const [head, blocks] = await Promise.all([
    getHead().catch(() => null),
    getRecentBlocks(15).catch(() => []),
  ]);
  return NextResponse.json({ head, blocks, fetchedAt: new Date().toISOString() });
}
