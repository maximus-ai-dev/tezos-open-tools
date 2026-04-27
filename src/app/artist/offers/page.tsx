"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { buildAcceptOffersBatch, isAcceptableOffer, sendBatch } from "@/lib/tezos/operations";
import {
  MARKETPLACE_NAMES,
  objktTokenLink,
  objktProfileLink,
  objktCollectionLink,
} from "@/lib/constants";
import {
  formatDate,
  formatTez,
  ipfsToHttp,
  shortAddress,
} from "@/lib/utils";
import type { OfferActive } from "@/lib/objkt";

export default function ArtistOffersPage() {
  const { address, status, connect } = useWallet();
  const [data, setData] = useState<{ address: string; offers: OfferActive[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loading = !!address && data?.address !== address;
  const offers = useMemo(() => (data?.address === address ? data.offers : null), [data, address]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/offers-received?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res: { offers: OfferActive[] }) => {
        if (!cancelled) setData({ address, offers: res.offers });
      })
      .catch(() => {
        if (!cancelled) setData({ address, offers: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const acceptable = useMemo(
    () =>
      (offers ?? []).filter(
        (o) =>
          o.token !== null &&
          o.bigmap_key !== null &&
          o.marketplace_contract !== null &&
          isAcceptableOffer(o.marketplace_contract),
      ),
    [offers],
  );

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function accept() {
    setResult(null);
    if (!address || !offers) return;
    const toAccept = acceptable.filter((o) => selected.has(o.id));
    if (toAccept.length === 0) {
      setResult({ ok: false, message: "Select at least one acceptable offer." });
      return;
    }
    setBusy(true);
    try {
      const ops = await buildAcceptOffersBatch(
        address,
        toAccept.map((o) => ({
          offerId: o.bigmap_key as number,
          marketplaceContract: o.marketplace_contract as string,
          fa: o.token!.fa_contract,
          tokenId: o.token!.token_id,
        })),
      );
      const { opHash } = await sendBatch(ops);
      setResult({ ok: true, message: opHash });
      setSelected(new Set());
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Artist Offers</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Active offers on tokens you currently own. Select multiple and accept them in one
          batched transaction. Acceptance currently supports objkt&apos;s marketplace contracts;
          HEN/Teia/fxhash offers will need to be accepted on those marketplaces.
        </p>
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          ⚠ Accepting an offer transfers the token and finalises the sale. Each accept calls
          update_operators (add) → fulfill_offer → update_operators (remove) so your operator
          permissions return to their prior state.
        </p>
      </header>

      {!address ? (
        <ConnectPrompt status={status} connect={connect} />
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading your incoming offers…</p>
      ) : !offers || offers.length === 0 ? (
        <p className="text-sm text-zinc-500">No active offers on tokens you hold.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Active offers:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{offers.length}</span>
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Acceptable here:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                {acceptable.length}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set(acceptable.map((o) => o.id)))}
              className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Select all acceptable
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void accept()}
              disabled={busy || selected.size === 0}
              className="ml-auto px-4 py-1.5 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Signing…" : `Accept ${selected.size} offer${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Offer</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Buyer</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Marketplace</th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Expires</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const tok = o.token;
                  const isCollection = !!o.collection_offer && !tok;
                  const supported =
                    !!tok &&
                    o.bigmap_key !== null &&
                    o.marketplace_contract !== null &&
                    isAcceptableOffer(o.marketplace_contract);
                  const thumb = tok ? ipfsToHttp(tok.thumbnail_uri) ?? ipfsToHttp(tok.display_uri) : null;
                  const tokenHref = isCollection
                    ? o.fa
                      ? objktCollectionLink(o.fa.contract)
                      : "#"
                    : tok
                      ? objktTokenLink(tok.fa_contract, tok.token_id)
                      : "#";
                  return (
                    <tr
                      key={o.id}
                      className={`border-t border-zinc-200 dark:border-zinc-800 ${
                        selected.has(o.id) ? "bg-green-50 dark:bg-green-950/30" : ""
                      } ${supported ? "" : "opacity-60"}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          disabled={!supported}
                          checked={selected.has(o.id)}
                          onChange={() => toggle(o.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={tokenHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:underline"
                        >
                          <span className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0">
                            {thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                            )}
                          </span>
                          <span className="truncate max-w-xs">
                            {tok?.name ??
                              (isCollection ? o.fa?.name ?? "(collection)" : `#${tok?.token_id ?? "?"}`)}
                          </span>
                        </a>
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {formatTez(o.price_xtz ?? o.price)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {o.buyer_address ? (
                          <a
                            href={objktProfileLink(o.buyer_address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {o.buyer?.alias ?? shortAddress(o.buyer_address)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {o.marketplace_contract
                          ? MARKETPLACE_NAMES[o.marketplace_contract] ?? "marketplace"
                          : "—"}
                        {!supported && (
                          <span className="ml-2 text-amber-700 dark:text-amber-400">
                            (accept manually)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {o.expiry ? formatDate(o.expiry) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result && <Result result={result} />}
        </>
      )}
    </div>
  );
}

function ConnectPrompt({ connect, status }: { connect: () => Promise<void>; status: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Connect your wallet to use this tool.</p>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={status === "connecting"}
        className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-60"
      >
        {status === "connecting" ? "Connecting…" : "Connect wallet"}
      </button>
    </div>
  );
}

function Result({ result }: { result: { ok: boolean; message: string } }) {
  return (
    <div
      className={`mt-6 rounded-md p-3 text-sm ${
        result.ok
          ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-900"
          : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-900"
      }`}
    >
      {result.ok ? (
        <span>
          Sent! Op hash:{" "}
          <a
            href={`https://tzkt.io/${result.message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-mono break-all"
          >
            {result.message}
          </a>
        </span>
      ) : (
        <span>{result.message}</span>
      )}
    </div>
  );
}
