import { NextResponse } from "next/server";
import { getTokensByPairs } from "@/lib/objkt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get("pairs") ?? "").trim();
  if (!raw) return NextResponse.json({ tokens: [] });

  // Format: "fa1:tokenId1,fa2:tokenId2,..."
  const pairs = raw
    .split(",")
    .map((s) => {
      const [fa, tokenId] = s.split(":");
      return fa && tokenId ? { fa: fa.trim(), tokenId: tokenId.trim() } : null;
    })
    .filter((p): p is { fa: string; tokenId: string } => p !== null)
    .slice(0, 200);

  if (pairs.length === 0) return NextResponse.json({ tokens: [] });

  const tokens = await getTokensByPairs(pairs).catch(() => []);
  return NextResponse.json({ tokens });
}
