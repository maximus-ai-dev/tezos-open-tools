export type ToolCategory = "collector" | "fxhash" | "artist" | "general" | "advanced";

export interface Tool {
  slug: string;
  href: string;
  name: string;
  description: string;
  category: ToolCategory;
  status: "ready" | "stub" | "planned";
  /** When status==="stub", short note on what's missing. */
  stubReason?: string;
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  collector: "Collector",
  fxhash: "fxhash",
  artist: "Artist",
  general: "General",
  advanced: "Advanced",
};

export const TOOLS: Tool[] = [
  // ── COLLECTOR ──
  { slug: "history", href: "/history", name: "Token History", description: "Full transfer and sale history for any Tezos NFT.", category: "general", status: "ready" },
  { slug: "me", href: "/me", name: "Your wallet", description: "Snapshot of your holdings, listings, offers, and recent ops.", category: "collector", status: "ready" },
  { slug: "pnl", href: "/pnl", name: "P&L", description: "Cost basis vs current floor for tokens you still hold.", category: "collector", status: "ready" },
  { slug: "wallet-profile", href: "/wallet", name: "Wallet Profile", description: "Public, shareable read-only profile for any Tezos wallet.", category: "general", status: "ready" },
  { slug: "activity", href: "/activity", name: "Activity Heatmap", description: "Daily buy + sell calendar for any wallet, last 365 days.", category: "general", status: "ready" },
  { slug: "diff", href: "/diff", name: "Wallet Diff", description: "Compare two wallets — shared tokens, shared artists, what each holds alone.", category: "general", status: "ready" },
  { slug: "live", href: "/live", name: "Live Feed", description: "Real-time marketplace activity (4s polling).", category: "collector", status: "ready" },
  { slug: "follow", href: "/follow", name: "Follow Feed", description: "Live sales involving wallets you've saved.", category: "collector", status: "ready" },
  { slug: "feed", href: "/feed", name: "Latest Mints", description: "New mints across the network.", category: "collector", status: "ready" },
  { slug: "resale", href: "/resale", name: "Collected Artworks", description: "Your collection with current floor and resale data.", category: "collector", status: "ready" },
  { slug: "english", href: "/english", name: "English Auctions", description: "Browse active English auctions.", category: "collector", status: "ready" },
  { slug: "flex", href: "/flex", name: "Flex", description: "Show off a wallet's collection in a clean grid.", category: "collector", status: "ready" },
  { slug: "offers-received", href: "/offers/received", name: "Offers Received", description: "Incoming offers on your tokens (read-only).", category: "collector", status: "ready" },
  { slug: "offers-manage", href: "/offers/manage", name: "Your Offers", description: "Outgoing offers you've placed (read-only).", category: "collector", status: "ready" },
  { slug: "duplicate", href: "/duplicate", name: "Multiple Editions", description: "Editions you hold more than one of.", category: "collector", status: "ready" },
  { slug: "artist-follow", href: "/artist/follow", name: "Following Analysis", description: "Latest creations from artists you've saved.", category: "collector", status: "ready" },
  { slug: "genart-batch", href: "/genart/batch", name: "Genart Batch Mint", description: "Batch-mint generative art outputs.", category: "collector", status: "stub", stubReason: "fxhash v1/v2 issuer contracts are inactive since 2022. The current fxhash v3 mint flow goes through a signer module + per-project contracts — needs reverse-engineering from a live fxhash mint to pin down the entrypoint shape." },
  { slug: "config-monitoring", href: "/config/monitoring", name: "Monitoring Config", description: "Manage saved wallets for /follow + /artist/follow.", category: "collector", status: "ready" },

  // ── FXHASH ──
  { slug: "fxhash-sales", href: "/fxhash/sales", name: "fxhash Sales", description: "Live sales feed for fxhash marketplaces.", category: "fxhash", status: "ready" },
  { slug: "fxhash-follow", href: "/fxhash/follow", name: "fxhash Secondary", description: "Sales of fxhash GENTKs across all marketplaces.", category: "fxhash", status: "ready" },
  { slug: "fxhash-offers", href: "/fxhash/offers", name: "fxhash Collection Offers", description: "Active offers on fxhash GENTK contracts.", category: "fxhash", status: "ready" },
  { slug: "fxhash-floor", href: "/fxhash/floor", name: "fxhash Floor Broom", description: "Cheapest active listings in a collection.", category: "fxhash", status: "ready" },
  { slug: "sweep", href: "/sweep", name: "Floor Sweep", description: "Buy multiple cheap listings in one signed transaction (objkt v6.2).", category: "fxhash", status: "ready" },
  { slug: "fxhash-generative", href: "/fxhash/generative", name: "fxhash Project", description: "Project info + iterations grid.", category: "fxhash", status: "ready" },
  { slug: "fxhash-holders", href: "/fxhash/holders", name: "fxhash Holders", description: "Top holders of a collection.", category: "fxhash", status: "ready" },
  { slug: "fxhash-top", href: "/fxhash/top", name: "fxhash Project Stats", description: "Top fxhash projects by 24h volume.", category: "fxhash", status: "ready" },
  { slug: "fxhash-market", href: "/fxhash/market", name: "fxhash Market Stats", description: "24h volume, top buyers/sellers, by marketplace.", category: "fxhash", status: "ready" },
  { slug: "fxhash-explorer", href: "/fxhash/explorer", name: "fxhash Variations", description: "Browse iterations sortable by mint date, floor, or top offer.", category: "fxhash", status: "ready" },

  // ── ARTIST ──
  { slug: "artist", href: "/artist", name: "Artist Summary", description: "Mints, listings, and recent sales for an artist.", category: "artist", status: "ready" },
  { slug: "artist-sale", href: "/artist/sale", name: "Manage Swaps", description: "Cancel your active listings in batches.", category: "artist", status: "ready" },
  { slug: "artist-offers", href: "/artist/offers", name: "Artist Offers", description: "Accept incoming offers in batches.", category: "artist", status: "ready" },
  { slug: "gallery", href: "/gallery", name: "Gallery", description: "Gallery view of an artist's work.", category: "artist", status: "ready" },
  { slug: "fans", href: "/fans", name: "Fans / Collectors", description: "Top collectors of an artist's work.", category: "artist", status: "ready" },
  { slug: "giveaway", href: "/giveaway", name: "Giveaway / Airdrop", description: "Send a token to many wallets at once.", category: "artist", status: "ready" },
  { slug: "pin", href: "/pin", name: "Pin Your Art", description: "Mark tokens as featured — local set, shareable via URL.", category: "artist", status: "ready" },
  { slug: "burned", href: "/burned", name: "Burns", description: "Your minted tokens that have been entirely burned.", category: "artist", status: "ready" },
  { slug: "swap-batch", href: "/swap/batch", name: "Batch Swap", description: "List many tokens for sale on objkt v6.2 in one signing.", category: "artist", status: "ready" },
  { slug: "swap-reswap", href: "/swap/reswap", name: "Batch Reswap / Unswap", description: "Cancel + re-list many tokens at once on objkt v6.2.", category: "artist", status: "ready" },

  // ── GENERAL ──
  { slug: "event", href: "/event", name: "Events", description: "On-chain contract events viewer.", category: "general", status: "ready" },
  { slug: "discovery", href: "/discovery", name: "Linked Wallets", description: "Find wallets a target trades NFTs with most.", category: "general", status: "ready" },
  { slug: "gifted", href: "/gifted", name: "Gifted Tokens", description: "Heuristic detection of tokens received without payment.", category: "general", status: "ready" },
  { slug: "migrate-transfer", href: "/migrate/transfer", name: "Transfer Tokens", description: "Send NFTs to another wallet (batched FA2).", category: "general", status: "ready" },
  { slug: "misc-referral", href: "/misc/referral", name: "Referral Fees", description: "Referral earnings on objkt sales.", category: "general", status: "ready" },
  { slug: "topsales", href: "/topsales", name: "Top Sales", description: "Highest-priced sales over a time window.", category: "general", status: "ready" },
  { slug: "barter", href: "/barter", name: "Barter", description: "Trade tokens directly with another wallet.", category: "general", status: "stub", stubReason: "No canonical Tezos NFT barter contract — none of the major marketplaces (objkt, fxhash, Versum, HEN, Teia) expose a 2-party atomic swap. Would need to deploy our own escrow contract or pick a third-party one." },
  { slug: "operators", href: "/operators", name: "Operator Approvals", description: "View + revoke FA2 operator rights you've granted.", category: "general", status: "ready" },
  { slug: "ops", href: "/ops", name: "Recent Operations", description: "Your last 30 signed transactions, statuses + tzkt links.", category: "general", status: "ready" },
  { slug: "compare", href: "/compare", name: "Cross-marketplace Floor", description: "An artist's listings broken down by marketplace.", category: "general", status: "ready" },
  { slug: "settings", href: "/settings", name: "Settings", description: "Local preferences for this browser.", category: "general", status: "ready" },
  { slug: "donate", href: "/donate", name: "Tip jar", description: "Send a small XTZ tip to the maintainer of this hosted instance.", category: "general", status: "ready" },

  // ── ADVANCED ──
  { slug: "mempool", href: "/mempool", name: "Gas Station", description: "Network status — head + recent blocks.", category: "advanced", status: "ready" },
  { slug: "mempool-drop", href: "/mempool/drop", name: "Drop Analysis", description: "Watch operations targeting a contract live.", category: "advanced", status: "ready" },
];

export function toolsByCategory(): Record<ToolCategory, Tool[]> {
  const groups: Record<ToolCategory, Tool[]> = {
    collector: [],
    fxhash: [],
    artist: [],
    general: [],
    advanced: [],
  };
  for (const tool of TOOLS) groups[tool.category].push(tool);
  return groups;
}
