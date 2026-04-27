# Changelog

## 0.1.0 — Initial release

First public version. 38 tools ready, 3 stubs, 1 planned. See [README](README.md) for the full list.

**Read-only tools** verified via HTTP smoke test (56 checks).

**Wallet-write tools** verified via dry-run simulation against mainnet RPC:
- Transfer, Giveaway (FA2 batch transfer)
- Manage Swaps (batch cancel on objkt v1/v4/v6/v6.1/v6.2/fp/fp2, HEN v2, Teia)
- Artist Offers (batch accept on objkt marketplaces)
- Batch Swap, Batch Reswap (objkt v6.2 ask)

**Live polling feeds** for sales activity, fxhash secondary market, follow feeds, mempool/network status.

**Stubs** (page explains the blocker): `/pin`, `/genart/batch`, `/barter`.
