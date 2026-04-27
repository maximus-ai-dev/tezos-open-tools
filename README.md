# Tezos NFT Toolkit

An open-source suite of tools for Tezos NFT collectors and artists — many of them inspired by [nftbiker.xyz](https://nftbiker.xyz). Free forever, MIT licensed, no logins, no rate limits, no arbitrary bans. Self-hostable on Vercel in one click, or run it locally.

> **Why this exists.** The Tezos NFT community has come to depend on a small number of closed-source tools. When their authors block users — even arbitrarily — there's no recourse. This project is the recourse: an open implementation of the same tools, where the only thing between an artist and their tools is `git clone`.

## Status

42 tools across collector / fxhash / artist / general / advanced categories.

| | count | what |
|---|---|---|
| ✅ ready | 38 | full implementation, tested via HTTP smoke + dry-run against real wallet state |
| 🚧 stub | 3 | intentionally not implemented — page tells the user why and points to a workaround |
| 📋 planned | 1 | not started |

The three stubs (`/pin`, `/genart/batch`, `/barter`) need contract research that's out of scope for the initial release — see their pages for the specific blocker. Community PRs welcome.

### Headline tools

**Read-only — no wallet needed**
- **Token History** — full transfer + sale history for any Tezos NFT
- **Top Sales** — highest-priced sales over a time window across all marketplaces
- **Live Feed** — real-time sales firehose (4-second polling)
- **Collected Artworks** / **Gallery** / **Artist Summary** — wallet-based views
- **Floor Broom** / **fxhash Project** / **fxhash Variations** — collection deep-dives
- **Linked Wallets** — find wallets that frequently exchange NFTs with a target
- **Top Sales / Market Stats / Project Stats** for fxhash

**Wallet-write — connect your wallet**
- **Transfer Tokens** — batched FA2 transfers
- **Giveaway / Airdrop** — send one token to many wallets
- **Manage Swaps** — batch-cancel listings (objkt, HEN, Teia)
- **Batch Swap** — list many tokens at once on objkt v6.2
- **Batch Reswap** — cancel + relist many tokens in one signing
- **Artist Offers** — batch-accept incoming offers

**Live polling**
- `/live`, `/feed`, `/follow`, `/fxhash/sales`, `/fxhash/follow`, `/mempool`, `/mempool/drop`

Every link to objkt.com is built with this site's referral wallet, sharing the marketplace's referral fee with whoever runs the deployment. (You can change the referral wallet in [src/lib/constants.ts](src/lib/constants.ts).)

## Quick start

```bash
git clone <your-fork-url>
cd tezos-open-tools
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables required for the read-only tools.

## Deploy to Vercel

The fastest way to host your own copy:

1. Fork this repo on GitHub.
2. Sign in to [vercel.com](https://vercel.com) → "Add New Project" → import your fork.
3. Click Deploy. Done. The default build command (`npm run build`) and output settings work out of the box.

You'll get a public URL like `tezos-open-tools-yourname.vercel.app`. Point your custom domain at it if you want.

There are no paid services to wire up — TzKT and objkt's GraphQL endpoints are both free public APIs.

## Tech stack

- **Next.js 16** App Router with React 19 server components
- **TypeScript** strict
- **Tailwind 4**
- **TzKT REST + WebSocket** for chain data ([api.tzkt.io](https://api.tzkt.io))
- **Objkt GraphQL** for marketplace data ([data.objkt.com](https://data.objkt.com/explore/))
- **Beacon SDK + Taquito** for wallet connection and transaction signing

## Project structure

```
src/
├── app/                    # Next.js App Router pages — one folder per tool
│   ├── api/                # Route handlers for live polling endpoints
│   ├── history/            # Token History
│   ├── resale/             # Collected Artworks
│   └── ... (40 more)
├── components/
│   ├── common/             # Shared building blocks (TokenCard, OfferTable, etc.)
│   ├── layout/             # Navbar
│   └── wallet/             # Beacon WalletProvider + ConnectButton
├── lib/
│   ├── tzkt/               # TzKT REST client (request throttling, query helpers)
│   ├── objkt/              # Objkt GraphQL client + typed queries
│   ├── tezos/              # Beacon wallet + Taquito operation builders
│   ├── constants.ts        # Marketplace contracts, referral wallet, helpers
│   ├── tools.ts            # Tool registry — drives navbar + homepage
│   └── utils.ts            # Formatting helpers
scripts/
├── smoke.sh                # HTTP smoke test for all ready tools
├── scan-wallet.ts          # Dry-run all wallet ops against a real address
└── test-wallet.ts          # Full wallet-write test harness (live or dry-run)
```

## Testing

```bash
# HTTP smoke test — verifies all 56 endpoints return the expected content
npm run test:smoke

# Dry-run wallet ops against a real address (no key needed, no risk)
echo "TEZOS_TEST_ADDRESS_A=tz1..." > .env.local
npm run test:scan

# Full wallet-write test harness (needs a burner key for the buyer side)
echo "TEZOS_TEST_KEY_B=edsk..." >> .env.local
npm run test:wallet -- --dry-run
```

The dry-run uses Tezos RPC's `run_operation` simulation — operations are validated against mainnet state without signing or broadcasting anything. This catches Michelson encoding bugs, wrong entrypoints, missing operator approvals, and insufficient balance issues at zero risk.

## Contributing

PRs welcome. The most-needed contributions:

- **Wire up `/pin`** — find objkt's profile/featured contract or design our own
- **Wire up `/genart/batch`** — reverse-engineer the current fxhash v3 mint flow
- **Wire up `/barter`** — pick or deploy a Tezos atomic-swap contract
- **`/gifted`** — heuristic page for "tokens received without payment"
- **Mobile responsive sweep** — several pages are desktop-biased
- **i18n** — currently English-only

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development loop, code conventions, and how to add a new tool.

## License

[MIT](LICENSE). Attribution appreciated, not required.

## Acknowledgments

- Many tools are direct re-implementations of features pioneered by [nftbiker.xyz](https://nftbiker.xyz) — credit where due.
- Built on the shoulders of the TzKT and objkt teams' free public APIs.
