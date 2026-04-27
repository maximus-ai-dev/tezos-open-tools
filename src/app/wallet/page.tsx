import { redirect } from "next/navigation";
import { PageShell } from "@/components/common/PageShell";
import { WalletInputForm } from "@/components/common/WalletInputForm";
import { isTezosAddress } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function WalletIndexPage({ searchParams }: PageProps) {
  const { address } = await searchParams;
  if (address && isTezosAddress(address)) redirect(`/wallet/${address}`);

  return (
    <PageShell
      title="Wallet profile"
      description="Public, shareable read-only profile for any Tezos wallet — holdings, creations, listings, sales."
    >
      <WalletInputForm action="/wallet" placeholder="tz1... wallet address" buttonLabel="View profile" />
      {address && !isTezosAddress(address) && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">Not a valid Tezos address.</p>
      )}
    </PageShell>
  );
}
