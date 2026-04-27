# Contributing

Thanks for considering a contribution. The point of this project is that nobody can be locked out — that includes contributors.

## Quick development loop

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint         # ESLint
npm run test:smoke   # HTTP smoke test (server must be running)
```

Type-check on its own:

```bash
npx tsc --noEmit
```

## Adding a new tool

Each tool is one folder under `src/app/`. To add a new tool:

1. Create the page file at the correct route, e.g. `src/app/floor-watch/page.tsx`.
2. Pick a Server Component (default) or Client Component (`"use client"`) based on whether it needs interactive state.
3. Reuse the shared layout building blocks: [`PageShell`](src/components/common/PageShell.tsx), [`WalletInputForm`](src/components/common/WalletInputForm.tsx), [`TokenGrid`](src/components/common/TokenGrid.tsx), [`TokenCard`](src/components/common/TokenCard.tsx), [`OfferTable`](src/components/common/OfferTable.tsx).
4. Register the tool in [`src/lib/tools.ts`](src/lib/tools.ts) — this drives both the homepage grid and the navbar dropdown.
5. Use the existing data clients in [`src/lib/tzkt/`](src/lib/tzkt) and [`src/lib/objkt/`](src/lib/objkt). If you need a new query, add it next to the existing ones — keep client and queries separate.
6. **Always** route objkt.com links through the helpers in [`src/lib/constants.ts`](src/lib/constants.ts) (`objktTokenLink`, `objktCollectionLink`, `objktProfileLink`) so the referral parameter is preserved.

## Adding a wallet-write tool

If your tool sends transactions:

1. Add the operation builder to [`src/lib/tezos/operations.ts`](src/lib/tezos/operations.ts) (browser/wallet-side) **and** [`scripts/lib/nodeOps.ts`](scripts/lib/nodeOps.ts) (Node-side mirror, used by the test harness). Keep them in sync — same dispatch tables, same shape, same defaults.
2. Test with the dry-run harness against a real wallet's existing state:
   ```bash
   echo "TEZOS_TEST_ADDRESS_A=tz1..." > .env.local
   npm run test:scan
   ```
3. The dry-run validates Michelson encoding + entrypoint dispatch + operator approvals against mainnet RPC simulation — catches almost all construction bugs before any user signs anything.

## Code conventions

- **TypeScript strict** is on. Don't disable it; if you need an escape hatch, narrow it tightly.
- **No `any` without a comment explaining why.**
- **Default to writing no comments.** Only add one when the *why* is non-obvious — a hidden invariant, a workaround, surprising behavior. Don't explain *what* the code does; well-named identifiers do that.
- **Don't add error handling for things that can't happen.** Trust internal code; only validate at system boundaries (user input, external APIs).
- **Server Components by default** for pages that fetch data. Use `"use client"` only when interactive state demands it.
- **Lint must pass.** `npm run lint` before you push.

## What I'd love help with

In rough priority order — open an issue if you want to grab one, or just send a PR:

1. **Wire up `/pin`, `/barter`, `/genart/batch`** (the three remaining stubs — each has a page explaining the specific blocker)
2. **`/gifted`** — heuristic detection of tokens received without payment
3. **Mobile responsive sweep** — a lot of pages have desktop-biased table layouts
4. **WebSocket-based live feeds** — currently we poll every 4 seconds; TzKT WebSocket would be lower-latency. `@microsoft/signalr` is already a dependency.
5. **i18n** — strings are English-only and hardcoded throughout
6. **Storage health check** — given a token, verify its IPFS metadata + media are still pinned somewhere
7. **Tax CSV export** — for a wallet, export sales/purchases in a format suitable for crypto tax software
8. **Cross-marketplace floor compare** — show me an artist's floor on objkt vs fxhash secondary vs Versum side-by-side

## Reporting bugs / asking for features

Open an issue. Use the templates if you can — they'll route you faster.

## Code of conduct

Be decent. Don't gatekeep. The whole reason this project exists is to be the opposite of that.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE) along with the rest of the project.
