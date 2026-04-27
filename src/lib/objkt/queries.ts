import { objktQuery } from "./client";

export interface ObjktTokenInfo {
  name: string | null;
  description: string | null;
  artifact_uri: string | null;
  display_uri: string | null;
  thumbnail_uri: string | null;
  mime: string | null;
  supply: number | null;
  token_id: string;
  fa_contract: string;
  timestamp: string | null;
  royalties: Array<{ amount: number; decimals: number }> | null;
  creators: Array<{ holder: { address: string; alias: string | null } }>;
  fa: { name: string | null; contract: string } | null;
  listings_active: Array<{
    bigmap_key: number | null;
    price: number;
    amount: number;
    amount_left: number;
    seller: { address: string; alias: string | null };
    marketplace_contract: string;
  }>;
}

const TOKEN_INFO_QUERY = /* GraphQL */ `
  query TokenInfo($fa: String!, $tokenId: String!) {
    token(where: { fa_contract: { _eq: $fa }, token_id: { _eq: $tokenId } }, limit: 1) {
      name
      description
      artifact_uri
      display_uri
      thumbnail_uri
      mime
      supply
      token_id
      fa_contract
      timestamp
      royalties {
        amount
        decimals
      }
      creators {
        holder {
          address
          alias
        }
      }
      fa {
        name
        contract
      }
      listings_active: listings(
        where: { status: { _eq: "active" } }
        order_by: { price: asc }
      ) {
        bigmap_key
        price
        amount
        amount_left
        seller: seller {
          address
          alias
        }
        marketplace_contract
      }
    }
  }
`;

export async function getTokenInfo(fa: string, tokenId: string): Promise<ObjktTokenInfo | null> {
  const data = await objktQuery<{ token: ObjktTokenInfo[] }>(TOKEN_INFO_QUERY, { fa, tokenId });
  return data.token[0] ?? null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Holdings (for /resale, /duplicate)

export interface HeldToken {
  quantity: number;
  last_incremented_at: string | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
    description: string | null;
    display_uri: string | null;
    thumbnail_uri: string | null;
    artifact_uri: string | null;
    mime: string | null;
    supply: number | null;
    timestamp: string | null;
    fa: { name: string | null } | null;
    creators: Array<{ holder: { address: string; alias: string | null } }>;
    listings_active: Array<{
      price: number;
      seller_address: string;
      marketplace_contract: string;
    }>;
  };
}

const HOLDINGS_QUERY = /* GraphQL */ `
  query Holdings($address: String!, $limit: Int!, $offset: Int!, $minQty: numeric!) {
    holder(where: { address: { _eq: $address } }) {
      address
      alias
      held_tokens(
        where: { quantity: { _gt: $minQty } }
        order_by: { last_incremented_at: desc }
        limit: $limit
        offset: $offset
      ) {
        quantity
        last_incremented_at
        token {
          token_id
          fa_contract
          name
          description
          display_uri
          thumbnail_uri
          artifact_uri
          mime
          supply
          timestamp
          fa {
            name
          }
          creators {
            holder {
              address
              alias
            }
          }
          listings_active: listings(
            where: { status: { _eq: "active" } }
            order_by: { price: asc }
            limit: 1
          ) {
            price
            seller_address
            marketplace_contract
          }
        }
      }
    }
  }
`;

export interface HoldingsResult {
  address: string;
  alias: string | null;
  held: HeldToken[];
}

export async function getHoldings(
  address: string,
  opts: { limit?: number; offset?: number; minQty?: number } = {},
): Promise<HoldingsResult | null> {
  const { limit = 60, offset = 0, minQty = 0 } = opts;
  const data = await objktQuery<{
    holder: Array<{ address: string; alias: string | null; held_tokens: HeldToken[] }>;
  }>(HOLDINGS_QUERY, { address, limit, offset, minQty: String(minQty) });
  const h = data.holder[0];
  if (!h) return null;
  return { address: h.address, alias: h.alias, held: h.held_tokens };
}

// ──────────────────────────────────────────────────────────────────────────────
// Creations (for /gallery)

export interface CreatedToken {
  token_id: string;
  fa_contract: string;
  name: string | null;
  description: string | null;
  display_uri: string | null;
  thumbnail_uri: string | null;
  mime: string | null;
  supply: number | null;
  timestamp: string | null;
  fa: { name: string | null } | null;
  listings_active: Array<{ price: number; marketplace_contract: string }>;
}

const CREATIONS_QUERY = /* GraphQL */ `
  query Creations($address: String!, $limit: Int!, $offset: Int!) {
    token(
      where: { creators: { creator_address: { _eq: $address } } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      token_id
      fa_contract
      name
      description
      display_uri
      thumbnail_uri
      mime
      supply
      timestamp
      fa {
        name
      }
      listings_active: listings(
        where: { status: { _eq: "active" } }
        order_by: { price: asc }
        limit: 1
      ) {
        price
        marketplace_contract
      }
    }
  }
`;

export async function getCreations(
  address: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<CreatedToken[]> {
  const { limit = 60, offset = 0 } = opts;
  const data = await objktQuery<{ token: CreatedToken[] }>(CREATIONS_QUERY, {
    address,
    limit,
    offset,
  });
  return data.token;
}

// ──────────────────────────────────────────────────────────────────────────────
// Recent sales (for /topsales)

export interface SaleEvent {
  id: string;
  timestamp: string;
  price: number;
  price_xtz: number | null;
  marketplace_contract: string;
  seller_address: string | null;
  buyer_address: string | null;
  ophash: string | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
    display_uri: string | null;
    thumbnail_uri: string | null;
    creators: Array<{ holder: { address: string; alias: string | null } }>;
  } | null;
}

const RECENT_SALES_BY_PRICE_QUERY = /* GraphQL */ `
  query RecentSalesByPrice($since: timestamptz!, $limit: Int!) {
    listing_sale(
      where: { timestamp: { _gte: $since } }
      order_by: { price_xtz: desc_nulls_last }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      ophash
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

const RECENT_SALES_BY_TIME_QUERY = /* GraphQL */ `
  query RecentSalesByTime($since: timestamptz!, $limit: Int!) {
    listing_sale(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      ophash
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

export async function getRecentSales(opts: {
  hours?: number;
  limit?: number;
  sortBy?: "time" | "price";
} = {}): Promise<SaleEvent[]> {
  const { hours = 24, limit = 50, sortBy = "time" } = opts;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const query = sortBy === "price" ? RECENT_SALES_BY_PRICE_QUERY : RECENT_SALES_BY_TIME_QUERY;
  const data = await objktQuery<{ listing_sale: SaleEvent[] }>(query, {
    since: since.toISOString(),
    limit,
  });
  return data.listing_sale;
}

const RECENT_SALES_BY_FAS_QUERY = /* GraphQL */ `
  query RecentSalesByFas($since: timestamptz!, $fas: [String!]!, $limit: Int!) {
    listing_sale(
      where: {
        timestamp: { _gte: $since }
        token: { fa_contract: { _in: $fas } }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      ophash
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

// All recent sales of tokens whose fa_contract starts with a fxhash marker.
// Used by /fxhash/market and /fxhash/top to aggregate client-side.
const FXHASH_RECENT_SALES_QUERY = /* GraphQL */ `
  query FxhashRecentSales($since: timestamptz!, $fxhashFas: [String!]!, $limit: Int!) {
    listing_sale(
      where: {
        timestamp: { _gte: $since }
        token: { fa_contract: { _in: $fxhashFas } }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      ophash
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

export async function getFxhashRecentSales(
  fxhashFas: string[],
  opts: { hours?: number; limit?: number } = {},
): Promise<SaleEvent[]> {
  if (fxhashFas.length === 0) return [];
  const { hours = 24, limit = 500 } = opts;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const data = await objktQuery<{ listing_sale: SaleEvent[] }>(FXHASH_RECENT_SALES_QUERY, {
    since: since.toISOString(),
    fxhashFas,
    limit,
  });
  return data.listing_sale;
}

const FA_NAMES_QUERY = /* GraphQL */ `
  query FaNames($contracts: [String!]!) {
    fa(where: { contract: { _in: $contracts } }) {
      contract
      name
      logo
    }
  }
`;

export async function getFaNames(contracts: string[]): Promise<Map<string, { name: string | null; logo: string | null }>> {
  if (contracts.length === 0) return new Map();
  const data = await objktQuery<{ fa: Array<{ contract: string; name: string | null; logo: string | null }> }>(
    FA_NAMES_QUERY,
    { contracts },
  );
  return new Map(data.fa.map((row) => [row.contract, { name: row.name, logo: row.logo }]));
}

export async function getRecentSalesForFas(
  fas: string[],
  opts: { hours?: number; limit?: number } = {},
): Promise<SaleEvent[]> {
  if (fas.length === 0) return [];
  const { hours = 24, limit = 50 } = opts;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const data = await objktQuery<{ listing_sale: SaleEvent[] }>(RECENT_SALES_BY_FAS_QUERY, {
    since: since.toISOString(),
    fas,
    limit,
  });
  return data.listing_sale;
}

const COLLECTION_OFFERS_QUERY = /* GraphQL */ `
  query CollectionOffersByFas($fas: [String!]!, $limit: Int!) {
    offer_active(
      where: {
        fa_contract: { _in: $fas }
      }
      order_by: { price_xtz: desc_nulls_last }
      limit: $limit
    ) {
      id
      bigmap_key
      timestamp
      expiry
      price
      price_xtz
      amount_left
      collection_offer
      buyer_address
      seller_address
      target_address
      marketplace_contract
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
      fa {
        name
        contract
      }
      buyer {
        alias
        address
      }
    }
  }
`;

// Recent sales involving any of a set of wallets (as buyer or seller, or as creator of the token).
const SALES_INVOLVING_QUERY = /* GraphQL */ `
  query SalesInvolving($since: timestamptz!, $addresses: [String!]!, $limit: Int!) {
    listing_sale(
      where: {
        timestamp: { _gte: $since }
        _or: [
          { seller_address: { _in: $addresses } }
          { buyer_address: { _in: $addresses } }
          { token: { creators: { creator_address: { _in: $addresses } } } }
        ]
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      ophash
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

export async function getSalesInvolving(
  addresses: string[],
  opts: { hours?: number; limit?: number } = {},
): Promise<SaleEvent[]> {
  if (addresses.length === 0) return [];
  const { hours = 24, limit = 100 } = opts;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const data = await objktQuery<{ listing_sale: SaleEvent[] }>(SALES_INVOLVING_QUERY, {
    since: since.toISOString(),
    addresses,
    limit,
  });
  return data.listing_sale;
}

// All active listings on tokens created by a given artist, used by /compare
// to break down marketplace presence.

export interface ArtistListing {
  id: string;
  price: number;
  amount_left: number;
  marketplace_contract: string;
  token: { token_id: string; fa_contract: string; name: string | null } | null;
}

// Two-step: first fetch the creator's token_pks, then fetch listings filtered
// by token_pk._in. The single-step nested filter on `token.creators.creator_address`
// is too expensive for objkt's hasura — it errors out on prolific creators.

const CREATOR_TOKEN_PKS_QUERY = /* GraphQL */ `
  query CreatorTokenPks($address: String!, $limit: Int!) {
    token(
      where: { creators: { creator_address: { _eq: $address } } }
      limit: $limit
    ) {
      pk
    }
  }
`;

const LISTINGS_BY_TOKEN_PKS_QUERY = /* GraphQL */ `
  query ListingsByTokenPks($pks: [bigint!]!, $limit: Int!) {
    listing_active(
      where: { token_pk: { _in: $pks } }
      order_by: { price: asc }
      limit: $limit
    ) {
      id
      price
      amount_left
      marketplace_contract
      token { token_id fa_contract name }
    }
  }
`;

export async function getArtistListings(
  address: string,
  opts: { limit?: number } = {},
): Promise<ArtistListing[]> {
  const { limit = 1000 } = opts;
  const tokenData = await objktQuery<{ token: Array<{ pk: number }> }>(
    CREATOR_TOKEN_PKS_QUERY,
    { address, limit: 5000 },
  );
  const pks = tokenData.token.map((t) => t.pk);
  if (pks.length === 0) return [];
  const data = await objktQuery<{ listing_active: ArtistListing[] }>(
    LISTINGS_BY_TOKEN_PKS_QUERY,
    { pks, limit },
  );
  return data.listing_active;
}

// Active FA2 operator grants for a wallet (for /operators).
// Each row: this wallet has authorized `operator_address` to move
// (token.fa_contract, token.token_id) on its behalf.

export interface OperatorGrant {
  id: string;
  operator_address: string;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
  } | null;
}

const OPERATORS_QUERY = /* GraphQL */ `
  query Operators($address: String!, $limit: Int!) {
    token_operator(
      where: { owner_address: { _eq: $address }, allowed: { _eq: true } }
      order_by: { id: desc }
      limit: $limit
    ) {
      id
      operator_address
      token {
        token_id
        fa_contract
        name
      }
    }
  }
`;

export async function getActiveOperators(
  address: string,
  opts: { limit?: number } = {},
): Promise<OperatorGrant[]> {
  const { limit = 500 } = opts;
  const data = await objktQuery<{ token_operator: OperatorGrant[] }>(OPERATORS_QUERY, {
    address,
    limit,
  });
  return data.token_operator;
}

// Latest mints by any of a set of creators (for /artist/follow).
const CREATIONS_BY_AUTHORS_QUERY = /* GraphQL */ `
  query CreationsByAuthors($addresses: [String!]!, $limit: Int!) {
    token(
      where: {
        name: { _is_null: false }
        supply: { _gt: 0 }
        creators: { creator_address: { _in: $addresses } }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      token_id
      fa_contract
      name
      display_uri
      thumbnail_uri
      mime
      supply
      timestamp
      fa {
        name
      }
      creators {
        holder {
          address
          alias
        }
      }
      listings_active: listings(
        where: { status: { _eq: "active" } }
        order_by: { price: asc }
        limit: 1
      ) {
        price
        marketplace_contract
      }
    }
  }
`;

export async function getCreationsByAuthors(
  addresses: string[],
  opts: { limit?: number } = {},
): Promise<LatestMintToken[]> {
  if (addresses.length === 0) return [];
  const { limit = 60 } = opts;
  const data = await objktQuery<{ token: LatestMintToken[] }>(CREATIONS_BY_AUTHORS_QUERY, {
    addresses,
    limit,
  });
  return data.token;
}

export async function getOffersForFas(
  fas: string[],
  opts: { limit?: number } = {},
): Promise<OfferActive[]> {
  if (fas.length === 0) return [];
  const { limit = 100 } = opts;
  const data = await objktQuery<{ offer_active: OfferActive[] }>(COLLECTION_OFFERS_QUERY, {
    fas,
    limit,
  });
  return data.offer_active;
}

// ──────────────────────────────────────────────────────────────────────────────
// Active listings for a seller (for /artist/sale)

export interface SellerListing {
  id: string;
  bigmap_key: number | null;
  price: number;
  amount: number;
  amount_left: number;
  marketplace_contract: string;
  fa_contract: string | null;
  timestamp: string | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
    display_uri: string | null;
    thumbnail_uri: string | null;
  } | null;
}

const SELLER_LISTINGS_QUERY = /* GraphQL */ `
  query SellerListings($address: String!, $limit: Int!) {
    listing_active(
      where: { seller_address: { _eq: $address } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      bigmap_key
      price
      amount
      amount_left
      marketplace_contract
      fa_contract
      timestamp
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
      }
    }
  }
`;

export async function getSellerListings(
  address: string,
  opts: { limit?: number } = {},
): Promise<SellerListing[]> {
  const { limit = 200 } = opts;
  const data = await objktQuery<{ listing_active: SellerListing[] }>(SELLER_LISTINGS_QUERY, {
    address,
    limit,
  });
  return data.listing_active;
}

// ──────────────────────────────────────────────────────────────────────────────
// Active English auctions (for /english)

export interface EnglishAuction {
  id: string;
  start_time: string | null;
  end_time: string | null;
  reserve: number | null;
  reserve_xtz: number | null;
  highest_bid: number | null;
  highest_bid_xtz: number | null;
  marketplace_contract: string | null;
  seller_address: string | null;
  highest_bidder_address: string | null;
  fa_contract: string | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
    display_uri: string | null;
    thumbnail_uri: string | null;
    creators: Array<{ holder: { address: string; alias: string | null } }>;
  } | null;
}

const ENGLISH_AUCTIONS_QUERY = /* GraphQL */ `
  query EnglishAuctions($limit: Int!) {
    english_auction_active(
      order_by: [{ end_time: asc_nulls_last }, { highest_bid_xtz: desc_nulls_last }]
      limit: $limit
    ) {
      id
      start_time
      end_time
      reserve
      reserve_xtz
      highest_bid
      highest_bid_xtz
      marketplace_contract
      seller_address
      highest_bidder_address
      fa_contract
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

export async function getActiveEnglishAuctions(
  opts: { limit?: number } = {},
): Promise<EnglishAuction[]> {
  const { limit = 60 } = opts;
  const data = await objktQuery<{ english_auction_active: EnglishAuction[] }>(
    ENGLISH_AUCTIONS_QUERY,
    { limit },
  );
  return data.english_auction_active;
}

// ──────────────────────────────────────────────────────────────────────────────
// Offers (active) — incoming and outgoing

export interface OfferActive {
  id: string;
  bigmap_key: number | null;
  timestamp: string;
  expiry: string | null;
  price: number;
  price_xtz: number | null;
  amount_left: number | null;
  collection_offer: string | null;
  buyer_address: string | null;
  seller_address: string | null;
  target_address: string | null;
  marketplace_contract: string | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
    display_uri: string | null;
    thumbnail_uri: string | null;
    creators: Array<{ holder: { address: string; alias: string | null } }>;
  } | null;
  fa: { name: string | null; contract: string } | null;
  buyer: { alias: string | null; address: string } | null;
}

const OFFERS_BASE_FIELDS = /* GraphQL */ `
  id
  bigmap_key
  timestamp
  expiry
  price
  price_xtz
  amount_left
  collection_offer
  buyer_address
  seller_address
  target_address
  marketplace_contract
  token {
    token_id
    fa_contract
    name
    display_uri
    thumbnail_uri
    creators {
      holder {
        address
        alias
      }
    }
  }
  fa {
    name
    contract
  }
  buyer {
    alias
    address
  }
`;

const OFFERS_RECEIVED_QUERY = /* GraphQL */ `
  query OffersReceived($address: String!, $limit: Int!) {
    offer_active(
      where: {
        _or: [
          { seller_address: { _eq: $address } }
          { target_address: { _eq: $address } }
        ]
      }
      order_by: { price_xtz: desc_nulls_last }
      limit: $limit
    ) {
      ${OFFERS_BASE_FIELDS}
    }
  }
`;

const OFFERS_MADE_QUERY = /* GraphQL */ `
  query OffersMade($address: String!, $limit: Int!) {
    offer_active(
      where: { buyer_address: { _eq: $address } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      ${OFFERS_BASE_FIELDS}
    }
  }
`;

export async function getOffersReceived(
  address: string,
  opts: { limit?: number } = {},
): Promise<OfferActive[]> {
  const { limit = 100 } = opts;
  const data = await objktQuery<{ offer_active: OfferActive[] }>(OFFERS_RECEIVED_QUERY, {
    address,
    limit,
  });
  return data.offer_active;
}

export async function getOffersMade(
  address: string,
  opts: { limit?: number } = {},
): Promise<OfferActive[]> {
  const { limit = 100 } = opts;
  const data = await objktQuery<{ offer_active: OfferActive[] }>(OFFERS_MADE_QUERY, {
    address,
    limit,
  });
  return data.offer_active;
}

// ──────────────────────────────────────────────────────────────────────────────
// Referral fees earned

export interface ReferralFee {
  id: string;
  price: number | null;
  price_xtz: number | null;
  event: {
    id: string;
    timestamp: string | null;
    event_type: string | null;
    fa_contract: string | null;
    price: number | null;
    price_xtz: number | null;
    token: {
      token_id: string;
      fa_contract: string;
      name: string | null;
      display_uri: string | null;
      thumbnail_uri: string | null;
    } | null;
  } | null;
}

const REFERRAL_FEES_QUERY = /* GraphQL */ `
  query Referrals($address: String!, $limit: Int!) {
    referral(
      where: { referrer_address: { _eq: $address } }
      order_by: { event: { timestamp: desc } }
      limit: $limit
    ) {
      id
      price
      price_xtz
      event {
        id
        timestamp
        event_type
        fa_contract
        price
        price_xtz
        token {
          token_id
          fa_contract
          name
          display_uri
          thumbnail_uri
        }
      }
    }
  }
`;

export async function getReferralFees(
  address: string,
  opts: { limit?: number } = {},
): Promise<ReferralFee[]> {
  const { limit = 200 } = opts;
  const data = await objktQuery<{ referral: ReferralFee[] }>(REFERRAL_FEES_QUERY, {
    address,
    limit,
  });
  return data.referral;
}

// ──────────────────────────────────────────────────────────────────────────────
// Token holders for an artist's work (for /fans)

export interface TokenHolderRow {
  holder_address: string;
  quantity: number;
  holder: { alias: string | null } | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
  } | null;
}

const ARTIST_TOKEN_HOLDERS_QUERY = /* GraphQL */ `
  query ArtistHolders($address: String!, $limit: Int!, $offset: Int!) {
    token_holder(
      where: {
        token: { creators: { creator_address: { _eq: $address } } }
        quantity: { _gt: "0" }
        holder_address: { _neq: $address }
      }
      order_by: { quantity: desc }
      limit: $limit
      offset: $offset
    ) {
      holder_address
      quantity
      holder {
        alias
      }
      token {
        token_id
        fa_contract
        name
      }
    }
  }
`;

export async function getArtistTokenHolders(
  address: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<TokenHolderRow[]> {
  const { limit = 5000, offset = 0 } = opts;
  const data = await objktQuery<{ token_holder: TokenHolderRow[] }>(
    ARTIST_TOKEN_HOLDERS_QUERY,
    { address, limit, offset },
  );
  return data.token_holder;
}

// ──────────────────────────────────────────────────────────────────────────────
// Burned tokens by creator (for /burned)

const CREATOR_BURNED_QUERY = /* GraphQL */ `
  query CreatorBurned($address: String!, $limit: Int!) {
    token(
      where: {
        creators: { creator_address: { _eq: $address } }
        supply: { _eq: 0 }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      token_id
      fa_contract
      name
      description
      display_uri
      thumbnail_uri
      mime
      supply
      timestamp
      fa {
        name
      }
    }
  }
`;

export async function getCreatorBurnedTokens(
  address: string,
  opts: { limit?: number } = {},
): Promise<CreatedToken[]> {
  const { limit = 200 } = opts;
  const data = await objktQuery<{ token: CreatedToken[] }>(CREATOR_BURNED_QUERY, {
    address,
    limit,
  });
  return data.token;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sales of an artist's work (for /artist summary)

const ARTIST_SALES_QUERY = /* GraphQL */ `
  query ArtistSales($address: String!, $since: timestamptz!, $limit: Int!) {
    listing_sale(
      where: {
        timestamp: { _gte: $since }
        token: { creators: { creator_address: { _eq: $address } } }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

export async function getArtistSales(
  address: string,
  opts: { hours?: number; limit?: number } = {},
): Promise<SaleEvent[]> {
  const { hours = 24 * 90, limit = 200 } = opts;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const data = await objktQuery<{ listing_sale: SaleEvent[] }>(ARTIST_SALES_QUERY, {
    address,
    since: since.toISOString(),
    limit,
  });
  return data.listing_sale;
}

// ──────────────────────────────────────────────────────────────────────────────
// Latest mints (for /feed)

const LATEST_MINTS_QUERY = /* GraphQL */ `
  query LatestMints($limit: Int!) {
    token(
      where: { name: { _is_null: false }, supply: { _gt: 0 } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      token_id
      fa_contract
      name
      display_uri
      thumbnail_uri
      mime
      supply
      timestamp
      fa {
        name
      }
      creators {
        holder {
          address
          alias
        }
      }
      listings_active: listings(
        where: { status: { _eq: "active" } }
        order_by: { price: asc }
        limit: 1
      ) {
        price
        marketplace_contract
      }
    }
  }
`;

export interface LatestMintToken extends CreatedToken {
  creators: Array<{ holder: { address: string; alias: string | null } }>;
}

export async function getLatestMints(opts: { limit?: number } = {}): Promise<LatestMintToken[]> {
  const { limit = 60 } = opts;
  const data = await objktQuery<{ token: LatestMintToken[] }>(LATEST_MINTS_QUERY, { limit });
  return data.token;
}

// ──────────────────────────────────────────────────────────────────────────────
// Collection / FA contract data (used by fxhash tools and generic collection lookups)

export interface FaInfo {
  contract: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  type: string | null;
  category: string | null;
  creator_address: string | null;
  floor_price: number | null;
  editions: number | null;
  items: number | null;
  creator: { alias: string | null; address: string } | null;
}

const FA_INFO_QUERY = /* GraphQL */ `
  query FaInfo($fa: String!) {
    fa_by_pk(contract: $fa) {
      contract
      name
      description
      logo
      type
      category
      creator_address
      floor_price
      editions
      items
      creator {
        alias
        address
      }
    }
  }
`;

export async function getFaInfo(fa: string): Promise<FaInfo | null> {
  const data = await objktQuery<{ fa_by_pk: FaInfo | null }>(FA_INFO_QUERY, { fa });
  return data.fa_by_pk;
}

const FA_TOKENS_QUERY = /* GraphQL */ `
  query FaTokens($fa: String!, $limit: Int!, $offset: Int!) {
    token(
      where: { fa_contract: { _eq: $fa } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      token_id
      fa_contract
      name
      display_uri
      thumbnail_uri
      mime
      supply
      timestamp
      creators {
        holder {
          address
          alias
        }
      }
      listings_active: listings(
        where: { status: { _eq: "active" } }
        order_by: { price: asc }
        limit: 1
      ) {
        price
        marketplace_contract
      }
    }
  }
`;

export async function getFaTokens(
  fa: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<LatestMintToken[]> {
  const { limit = 60, offset = 0 } = opts;
  const data = await objktQuery<{ token: LatestMintToken[] }>(FA_TOKENS_QUERY, {
    fa,
    limit,
    offset,
  });
  return data.token;
}

// ──────────────────────────────────────────────────────────────────────────────
// Variations — richer iteration view (for /fxhash/explorer)

export interface VariationToken {
  token_id: string;
  fa_contract: string;
  name: string | null;
  display_uri: string | null;
  thumbnail_uri: string | null;
  mime: string | null;
  supply: number | null;
  timestamp: string | null;
  highest_offer: number | null;
  lowest_ask: number | null;
  holders: Array<{ holder_address: string; holder: { alias: string | null } | null; quantity: number }>;
  listings_active: Array<{
    bigmap_key: number | null;
    price: number;
    amount_left: number;
    marketplace_contract: string;
  }>;
  listing_sales: Array<{ price_xtz: number | null; timestamp: string }>;
}

const VARIATIONS_QUERY = /* GraphQL */ `
  query Variations($fa: String!, $limit: Int!, $offset: Int!, $orderBy: [token_order_by!]) {
    token(
      where: { fa_contract: { _eq: $fa } }
      order_by: $orderBy
      limit: $limit
      offset: $offset
    ) {
      token_id
      fa_contract
      name
      display_uri
      thumbnail_uri
      mime
      supply
      timestamp
      highest_offer
      lowest_ask
      holders(where: { quantity: { _gt: "0" } }, limit: 1) {
        holder_address
        quantity
        holder {
          alias
        }
      }
      listings_active: listings(
        where: { status: { _eq: "active" } }
        order_by: { price: asc }
        limit: 1
      ) {
        bigmap_key
        price
        amount_left
        marketplace_contract
      }
      listing_sales(order_by: { timestamp: desc }, limit: 1) {
        price_xtz
        timestamp
      }
    }
  }
`;

export type VariationSort = "newest" | "oldest" | "floor_asc" | "highest_offer_desc";

function variationOrderBy(sort: VariationSort): unknown[] {
  switch (sort) {
    case "newest":
      return [{ timestamp: "desc" }];
    case "oldest":
      return [{ timestamp: "asc" }];
    case "floor_asc":
      return [{ lowest_ask: "asc_nulls_last" }];
    case "highest_offer_desc":
      return [{ highest_offer: "desc_nulls_last" }];
  }
}

export async function getVariations(
  fa: string,
  opts: { limit?: number; offset?: number; sort?: VariationSort } = {},
): Promise<VariationToken[]> {
  const { limit = 48, offset = 0, sort = "newest" } = opts;
  const data = await objktQuery<{ token: VariationToken[] }>(VARIATIONS_QUERY, {
    fa,
    limit,
    offset,
    orderBy: variationOrderBy(sort),
  });
  return data.token;
}

// Cheapest active listings within a contract (for /fxhash/floor)

export interface FloorListing {
  id: string;
  bigmap_key: number | null;
  price: number;
  amount: number;
  amount_left: number;
  marketplace_contract: string;
  seller_address: string | null;
  token: {
    token_id: string;
    fa_contract: string;
    name: string | null;
    display_uri: string | null;
    thumbnail_uri: string | null;
    creators: Array<{ holder: { address: string; alias: string | null } }>;
  } | null;
}

const FLOOR_QUERY = /* GraphQL */ `
  query Floor($fa: String!, $limit: Int!) {
    listing_active(
      where: { fa_contract: { _eq: $fa } }
      order_by: { price: asc_nulls_last }
      limit: $limit
    ) {
      id
      bigmap_key
      price
      amount
      amount_left
      marketplace_contract
      seller_address
      token {
        token_id
        fa_contract
        name
        display_uri
        thumbnail_uri
        creators {
          holder {
            address
            alias
          }
        }
      }
    }
  }
`;

export async function getFaFloor(
  fa: string,
  opts: { limit?: number } = {},
): Promise<FloorListing[]> {
  const { limit = 60 } = opts;
  const data = await objktQuery<{ listing_active: FloorListing[] }>(FLOOR_QUERY, {
    fa,
    limit,
  });
  return data.listing_active;
}

// Sales where a given wallet was the buyer (for /pnl cost-basis)

const SALES_BY_BUYER_QUERY = /* GraphQL */ `
  query SalesByBuyer($address: String!, $limit: Int!) {
    listing_sale(
      where: { buyer_address: { _eq: $address } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      price
      price_xtz
      marketplace_contract
      seller_address
      buyer_address
      token {
        token_id
        fa_contract
      }
    }
  }
`;

export interface BuyerSaleRow {
  id: string;
  timestamp: string;
  price: number;
  price_xtz: number | null;
  marketplace_contract: string;
  seller_address: string | null;
  buyer_address: string | null;
  token: { token_id: string; fa_contract: string } | null;
}

export async function getSalesByBuyer(
  address: string,
  opts: { limit?: number } = {},
): Promise<BuyerSaleRow[]> {
  const { limit = 1000 } = opts;
  const data = await objktQuery<{ listing_sale: BuyerSaleRow[] }>(SALES_BY_BUYER_QUERY, {
    address,
    limit,
  });
  return data.listing_sale;
}

// Top holders within an FA contract (for /fxhash/holders)

const FA_HOLDERS_QUERY = /* GraphQL */ `
  query FaHolders($fa: String!, $limit: Int!, $offset: Int!) {
    token_holder(
      where: {
        token: { fa_contract: { _eq: $fa } }
        quantity: { _gt: "0" }
      }
      order_by: { last_incremented_at: desc }
      limit: $limit
      offset: $offset
    ) {
      holder_address
      quantity
      holder {
        alias
      }
      token {
        token_id
        name
      }
    }
  }
`;

export async function getFaHolders(
  fa: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<TokenHolderRow[]> {
  const { limit = 1000, offset = 0 } = opts;
  const data = await objktQuery<{ token_holder: TokenHolderRow[] }>(FA_HOLDERS_QUERY, {
    fa,
    limit,
    offset,
  });
  return data.token_holder;
}
