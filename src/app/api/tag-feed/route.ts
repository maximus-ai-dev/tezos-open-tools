import { NextResponse } from "next/server";
import { getTokensByTag } from "@/lib/objkt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tag = (url.searchParams.get("tag") ?? "").trim();
  const since = url.searchParams.get("since") ?? undefined;
  const until = url.searchParams.get("until") ?? undefined;
  if (!tag) return NextResponse.json({ tokens: [] });
  const tokens = await getTokensByTag(tag, { since, until, limit: 60 }).catch(() => []);
  return NextResponse.json({ tokens });
}
