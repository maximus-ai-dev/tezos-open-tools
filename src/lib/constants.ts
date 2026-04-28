export const REFERRAL_WALLET = "tz1cEVvuLSWGqLAQ5QTTLdKA56PyAYmiCDy7";

// Tip-jar address for /donate. Forks: change this to your own address.
export const DONATION_WALLET = REFERRAL_WALLET;

// Project metadata — update these when you fork / rehost.
export const PROJECT_NAME = "Tezos Open Tools";
export const GITHUB_URL = "https://github.com/maximus-ai-dev/tezos-open-tools";

export const TZKT_API = "https://api.tzkt.io/v1";
export const TZKT_WS = "wss://api.tzkt.io/v1/ws";

export const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";
export const OBJKT_BASE_URL = "https://objkt.com";

// Active marketplace + auction contracts (cross-checked against Objkt's marketplace_contract table).
export const CONTRACTS = {
  OBJKT_MARKETPLACE_V1: "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq",
  OBJKT_MARKETPLACE_V4: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  OBJKT_MARKETPLACE_V6: "KT1CePTyk6fk4cFr6fasY5YXPGks6ttjSLp4",
  OBJKT_MARKETPLACE_V61: "KT1Xjap1TwmDR1d8yEd8ErkraAj2mbdMrPZY",
  OBJKT_MARKETPLACE_V62: "KT1SwbTqhSKF6Pdokiu1K4Fpi17ahPPzmt1X",
  OBJKT_FIXED_PRICING_HANDLER_1: "KT1NiZkkW82wsTKP95x8FefdiseDyU9vX66W",
  OBJKT_FIXED_PRICING_HANDLER_2: "KT1KzmnX6Ffip7zVgGiCUV6ygqDU8hhGsMAy",
  OBJKT_ENGLISH_V1: "KT1Wvk8fon9SgNEPQKewoSL2ziGGuCQebqZc",
  OBJKT_ENGLISH_V2: "KT1XjcRq5MLAzMKQ3UHsrue2SeU2NbxUrzmU",
  OBJKT_ENGLISH_V4: "KT18p94vjkkHYY3nPmernmgVR7HdZFzE7NAk",
  OBJKT_ENGLISH_V5: "KT1M6r2gRigUYP3tCSEjEptRnNG8qRLSRqcT",
  OBJKT_ENGLISH_V51: "KT1FJESNMf1WzRQva9Y5DPerKpgsDgRXYqyK",
  OBJKT_ENGLISH_V6: "KT18iSHoRW1iogamADWwQSDoZa3QkN4izkqj",
  OBJKT_DUTCH_V1: "KT1ET45vnyEFMLS9wX1dYHEs9aCN3twDEiQw",
  OBJKT_DUTCH_V2: "KT1W8PqJsZcpcAgDQH9SKQSZKvjVbpjUk8Sc",
  OBJKT_DUTCH_V3: "KT1QJ71jypKGgyTNtXjkCAYJZNhCKWiHuT2r",
  OBJKT_DUTCH_V4: "KT1XXu88HkNzQRHNgAf7Mnq68LyS9MZJNoHP",
  OBJKT_DUTCH_V6: "KT1S2Yz1a2Qn6nwLxozsyAiRwwcSRE8Q5E7E",
  HEN_MARKETPLACE_V1: "KT1Hkg5qeNhfwpKW4fXvq7HGZB9z2EnmCCA9",
  HEN_MARKETPLACE_V2: "KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn",
  TEIA_MARKETPLACE: "KT1PHubm9HtyQEJ4BBpMTVomq6mhbfNZ9z5w",
  FXHASH_MARKETPLACE_V1: "KT1GbyoDi7H1sfXmimXpptZJuCdHMh66WS9u",
  FXHASH_MARKETPLACE_V3: "KT1M1NyU9X4usEimt2f3kDaijZnDMNBu42Ja",
  VERSUM_MARKETPLACE_V1: "KT1GyRAJNdizF1nojQz62uGYkx8WFRUJm9X5",
  TYPED_MARKETPLACE: "KT1VoZeuBMJF6vxtLqEFMoc4no5VDG789D7z",
  AKASWAP_V1: "KT1HGL8vx7DP4xETVikL4LUYvFxSV19DxdFN",
  AKASWAP_V2: "KT1Qieo8hJWj2rHFfe8BRqnMHXYga9av89GJ",
  AKASWAP_V21: "KT1Dn3sambs7KZGW88hH2obZeSzfmCmGvpFo",
  AKASWAP_OFFER: "KT1J2C7BsYNnSjQsGoyrSXShhYGkrDDLVGDd",
  EIGHT_BIDOU_8X8: "KT1BvWGFENd4CXW5F3u4n31xKfJhmBGipoqF",
  EIGHT_BIDOU_24X24_MONO: "KT1AHBvSo828QwscsjDjeUuep7MgApi8hXqA",
  EIGHT_BIDOU_24X24_COLOR: "KT1QtnHR8p2hBjUhPRy9BCWgy7s7L578PA7N",
  EIGHT_SCRIBO: "KT19vw7kh7dzTRxFUZNWu39773baauzNWtzj",
  // Issuer / GENTK contracts (not marketplaces but useful for filters)
  FXHASH_GENTK_V1: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  FXHASH_GENTK_V2: "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi",
} as const;

export type MarketplaceContract = (typeof CONTRACTS)[keyof typeof CONTRACTS];

export const MARKETPLACE_NAMES: Record<string, string> = {
  [CONTRACTS.OBJKT_MARKETPLACE_V1]: "objkt v1",
  [CONTRACTS.OBJKT_MARKETPLACE_V4]: "objkt v4",
  [CONTRACTS.OBJKT_MARKETPLACE_V6]: "objkt v6",
  [CONTRACTS.OBJKT_MARKETPLACE_V61]: "objkt v6.1",
  [CONTRACTS.OBJKT_MARKETPLACE_V62]: "objkt v6.2",
  [CONTRACTS.OBJKT_FIXED_PRICING_HANDLER_1]: "objkt fp",
  [CONTRACTS.OBJKT_FIXED_PRICING_HANDLER_2]: "objkt fp v2",
  [CONTRACTS.OBJKT_ENGLISH_V1]: "objkt eng v1",
  [CONTRACTS.OBJKT_ENGLISH_V2]: "objkt eng v2",
  [CONTRACTS.OBJKT_ENGLISH_V4]: "objkt eng v4",
  [CONTRACTS.OBJKT_ENGLISH_V5]: "objkt eng v5",
  [CONTRACTS.OBJKT_ENGLISH_V51]: "objkt eng v5.1",
  [CONTRACTS.OBJKT_ENGLISH_V6]: "objkt eng v6",
  [CONTRACTS.OBJKT_DUTCH_V1]: "objkt dutch v1",
  [CONTRACTS.OBJKT_DUTCH_V2]: "objkt dutch v2",
  [CONTRACTS.OBJKT_DUTCH_V3]: "objkt dutch v3",
  [CONTRACTS.OBJKT_DUTCH_V4]: "objkt dutch v4",
  [CONTRACTS.OBJKT_DUTCH_V6]: "objkt dutch v6",
  [CONTRACTS.HEN_MARKETPLACE_V1]: "hen v1",
  [CONTRACTS.HEN_MARKETPLACE_V2]: "hen v2",
  [CONTRACTS.TEIA_MARKETPLACE]: "teia",
  [CONTRACTS.FXHASH_MARKETPLACE_V1]: "fxhash v1",
  [CONTRACTS.FXHASH_MARKETPLACE_V3]: "fxhash v3",
  [CONTRACTS.VERSUM_MARKETPLACE_V1]: "versum",
  [CONTRACTS.TYPED_MARKETPLACE]: "typed",
  [CONTRACTS.AKASWAP_V1]: "akaswap v1",
  [CONTRACTS.AKASWAP_V2]: "akaswap v2",
  [CONTRACTS.AKASWAP_V21]: "akaswap v2.1",
  [CONTRACTS.AKASWAP_OFFER]: "akaswap offer",
  [CONTRACTS.EIGHT_BIDOU_8X8]: "8bidou 8×8",
  [CONTRACTS.EIGHT_BIDOU_24X24_MONO]: "8bidou 24×24 mono",
  [CONTRACTS.EIGHT_BIDOU_24X24_COLOR]: "8bidou 24×24",
  [CONTRACTS.EIGHT_SCRIBO]: "8scribo",
};

export const FXHASH_MARKETPLACE_CONTRACTS: ReadonlySet<string> = new Set([
  CONTRACTS.FXHASH_MARKETPLACE_V1,
  CONTRACTS.FXHASH_MARKETPLACE_V3,
]);

export function objktTokenLink(fa: string, tokenId: string): string {
  return `${OBJKT_BASE_URL}/tokens/${fa}/${tokenId}?ref=${REFERRAL_WALLET}`;
}

export function objktCollectionLink(fa: string): string {
  return `${OBJKT_BASE_URL}/collections/${fa}?ref=${REFERRAL_WALLET}`;
}

export function objktProfileLink(address: string): string {
  return `${OBJKT_BASE_URL}/profile/${address}?ref=${REFERRAL_WALLET}`;
}
