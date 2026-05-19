import { NextResponse } from "next/server";
import { getTokensByTag } from "@/lib/objkt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tagParam = (url.searchParams.get("tag") ?? "").trim();
  const since = url.searchParams.get("since") ?? undefined;
  const until = url.searchParams.get("until") ?? undefined;
  // Comma-separated → OR semantics across tag names.
  const tags = tagParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length === 0) return NextResponse.json({ tokens: [] });
  // limit 96 (not 60) so client-side sorting on the tag page covers the whole
  // set for a typical campaign tag rather than just the 60 newest.
  const tokens = await getTokensByTag(tags, { since, until, limit: 96 }).catch(() => []);
  return NextResponse.json({ tokens });
}
