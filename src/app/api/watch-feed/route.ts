import { NextResponse } from "next/server";
import { getSalesInvolving } from "@/lib/objkt";
import { isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("addresses") ?? "";
  const sinceISO = url.searchParams.get("since") ?? undefined;
  const addresses = raw
    .split(",")
    .map((s) => s.trim())
    .filter(isTezosAddress)
    .slice(0, 100);

  if (addresses.length === 0) return NextResponse.json({ events: [] });
  // Reject silly-far-back queries; fall back to last 7 days.
  const since = sinceISO && !Number.isNaN(Date.parse(sinceISO))
    ? new Date(Math.max(Date.parse(sinceISO), Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString()
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const events = await getSalesInvolving(addresses, { sinceISO: since, limit: 100 }).catch(() => []);
  return NextResponse.json({ events, since });
}
