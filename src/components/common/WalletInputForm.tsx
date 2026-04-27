interface WalletInputFormProps {
  action: string;
  initial?: string;
  paramName?: string;
  placeholder?: string;
  buttonLabel?: string;
}

export function WalletInputForm({
  action,
  initial = "",
  paramName = "address",
  placeholder = "tz1... wallet address",
  buttonLabel = "Look up",
}: WalletInputFormProps) {
  return (
    <form method="GET" action={action} className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        name={paramName}
        defaultValue={initial}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
      />
      <button
        type="submit"
        className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
