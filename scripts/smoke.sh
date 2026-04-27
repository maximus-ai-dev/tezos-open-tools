#!/usr/bin/env bash
# HTTP smoke test for all ready tools.

set -u
BASE=http://localhost:3000
ARTIST=tz1UBZUkXpKGhYsP5KtzDNqLLchwF4uHrGjw
FA=KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton
FX_GENTK_V2=KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi
TOKEN_Q="${FA}:152"

pass=0
fail=0

check() {
  local label="$1"; local url="$2"; local expect="$3"
  local body
  body=$(curl -s "$url")
  if [ -z "$body" ]; then
    printf "FAIL %-40s empty body\n" "$label"; fail=$((fail+1)); return
  fi
  if echo "$body" | grep -qE "$expect"; then
    printf "PASS %-40s\n" "$label"; pass=$((pass+1))
  else
    printf "FAIL %-40s missing /$expect/\n" "$label"; fail=$((fail+1))
  fi
}

# Pages — read-only
check "homepage" "$BASE/" "Tezos NFT Toolkit"
check "history empty" "$BASE/history" "Token History"
check "history token" "$BASE/history?q=$TOKEN_Q" "hDAO"
check "history referral" "$BASE/history?q=$TOKEN_Q" "ref=tz1cEVvuLSWGqLAQ5QTTLdKA56PyAYmiCDy7"
check "history bad" "$BASE/history?q=garbage" "Couldn"
check "resale wallet" "$BASE/resale?address=$ARTIST" "Sum of floors"
check "gallery wallet" "$BASE/gallery?address=$ARTIST" "(Showing latest|No creations)"
check "topsales 24h" "$BASE/topsales" "Highest-priced"
check "topsales 7d" "$BASE/topsales?window=7d" "Highest-priced"
check "english" "$BASE/english" "Active English"
check "duplicate wallet" "$BASE/duplicate?address=$ARTIST" "tokens held in multiple"
check "offers received" "$BASE/offers/received?address=$ARTIST" "Offers Received"
check "offers manage" "$BASE/offers/manage?address=$ARTIST" "Your Offers"
check "referral" "$BASE/misc/referral" "Referral Fees"
check "fans" "$BASE/fans?address=$ARTIST" "(unique collectors|No collectors)"
check "burned" "$BASE/burned?address=$ARTIST" "Burns"
check "discovery" "$BASE/discovery?address=$ARTIST" "(unique counterparties|No token transfers)"
check "artist summary" "$BASE/artist?address=$ARTIST" "(Tokens minted|No creations)"
check "feed" "$BASE/feed" "Latest Mints"
check "flex" "$BASE/flex?address=$ARTIST" "(pieces shown|No tokens)"
check "fxhash project" "$BASE/fxhash/generative?fa=$FA" "(View on objkt|No data)"
check "fxhash floor" "$BASE/fxhash/floor?fa=$FA" "Cheapest active"
check "fxhash holders big" "$BASE/fxhash/holders?fa=$FX_GENTK_V2" "too large for"
check "fxhash holders ok" "$BASE/fxhash/holders?fa=$FA" "(unique holders|No holders|too large)"
check "fxhash market" "$BASE/fxhash/market" "fxhash Market Stats"
check "fxhash top" "$BASE/fxhash/top" "fxhash Project Stats"
check "live" "$BASE/live" "Real-time sales"
check "fxhash sales" "$BASE/fxhash/sales" "fxhash Sales"
check "fxhash follow" "$BASE/fxhash/follow" "fxhash Secondary"
check "fxhash offers" "$BASE/fxhash/offers" "fxhash Collection Offers"
check "follow" "$BASE/follow" "Follow Feed"
check "artist follow" "$BASE/artist/follow" "Following Analysis"
check "config monitoring" "$BASE/config/monitoring" "Monitoring Config"
check "transfer" "$BASE/migrate/transfer" "Transfer Tokens"
check "giveaway" "$BASE/giveaway" "Giveaway"
check "manage swaps" "$BASE/artist/sale" "Manage Swaps"
check "artist offers" "$BASE/artist/offers" "Artist Offers"
check "events" "$BASE/event?contract=$FA" "Contract Events"
check "settings" "$BASE/settings" "Settings"
check "mempool" "$BASE/mempool" "Gas Station"
check "mempool drop empty" "$BASE/mempool/drop" "Drop Analysis"

# Remaining stubs — should still explicitly say "not yet implemented"
for slug in barter genart/batch; do
  check "stub: $slug" "$BASE/$slug" "not yet implemented"
done

# /pin upgraded from stub → real (local + URL-shareable)
check "pin ready" "$BASE/pin" "Pin Your Art"

# Newly upgraded — should NOT be stubs anymore
check "swap/batch ready" "$BASE/swap/batch" "Batch Swap"
check "swap/reswap ready" "$BASE/swap/reswap" "Batch Reswap"
check "fxhash/explorer ready" "$BASE/fxhash/explorer?fa=KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton" "Newest"

# API endpoints
check "api live sales" "$BASE/api/live/sales?limit=2" '"sales":\['
check "api live fxhash" "$BASE/api/live/sales?fxhash=1&minutes=720" '"sales":\['
check "api sales-fa" "$BASE/api/live/sales-fa?fas=KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE&limit=2" '"sales":\['
check "api sales-involving" "$BASE/api/live/sales-involving?addresses=$ARTIST&minutes=720" '"sales":\['
check "api creations-by" "$BASE/api/creations-by?addresses=$ARTIST&limit=5" '"tokens":\['
check "api listings" "$BASE/api/listings?address=$ARTIST" '"listings":\['
check "api offers-received" "$BASE/api/offers-received?address=$ARTIST" '"offers":\['
check "api head" "$BASE/api/head" '"blocks":\['
check "api drop" "$BASE/api/drop?target=$FA" '"ops":\['

echo
echo "passed: $pass  failed: $fail"
exit "$fail"
