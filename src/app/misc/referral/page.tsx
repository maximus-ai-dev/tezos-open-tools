import { getReferralFees } from "@/lib/objkt";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { REFERRAL_WALLET, objktTokenLink } from "@/lib/constants";
import { formatDate, formatTez, ipfsToHttp, isTezosAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ReferralPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  const target = address || REFERRAL_WALLET;
  const valid = isTezosAddress(target);

  return (
    <PageShell
      title="Referral Fees"
      description="Fees earned via referral links on objkt sales. Defaults to this site's referral wallet."
    >
      <WalletInputForm
        action="/misc/referral"
        initial={address ?? ""}
        placeholder={`tz1... (defaults to ${REFERRAL_WALLET})`}
      />
      {!valid ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      ) : (
        <ReferralFees address={target} />
      )}
    </PageShell>
  );
}

async function ReferralFees({ address }: { address: string }) {
  const fees = await getReferralFees(address, { limit: 500 }).catch(() => []);
  const totalEarned = fees.reduce((sum, f) => sum + (f.price_xtz ?? f.price ?? 0), 0);
  const totalVolume = fees.reduce((sum, f) => sum + (f.event?.price_xtz ?? f.event?.price ?? 0), 0);

  if (fees.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No referral fees recorded for <code className="font-mono text-xs">{address}</code> yet.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Referrals" value={String(fees.length)} />
        <Stat label="Volume referred" value={formatTez(totalVolume)} />
        <Stat label="Fees earned" value={formatTez(totalEarned)} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">When</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Token</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Sale price</th>
              <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">Fee earned</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => {
              const tok = f.event?.token;
              const thumb = tok ? ipfsToHttp(tok.thumbnail_uri) ?? ipfsToHttp(tok.display_uri) : null;
              return (
                <tr
                  key={f.id}
                  className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {formatDate(f.event?.timestamp ?? null)}
                  </td>
                  <td className="px-3 py-2">
                    {tok ? (
                      <a
                        href={objktTokenLink(tok.fa_contract, tok.token_id)}
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
                        <span className="truncate max-w-xs">{tok.name ?? `#${tok.token_id}`}</span>
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                    {formatTez(f.event?.price_xtz ?? f.event?.price)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {formatTez(f.price_xtz ?? f.price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
