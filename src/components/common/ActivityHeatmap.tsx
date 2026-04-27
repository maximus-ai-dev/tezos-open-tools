interface DayCell {
  date: string; // YYYY-MM-DD
  buys: number;
  sells: number;
  total: number;
}

interface Props {
  buys: Array<{ timestamp: string }>;
  sells: Array<{ timestamp: string }>;
  /** Days back to display. Default: 365. */
  days?: number;
}

const CELL = 12;
const GAP = 2;

export function ActivityHeatmap({ buys, sells, days = 365 }: Props) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const counts = new Map<string, { buys: number; sells: number }>();
  for (const b of buys) {
    const d = b.timestamp.slice(0, 10);
    const row = counts.get(d) ?? { buys: 0, sells: 0 };
    row.buys++;
    counts.set(d, row);
  }
  for (const s of sells) {
    const d = s.timestamp.slice(0, 10);
    const row = counts.get(d) ?? { buys: 0, sells: 0 };
    row.sells++;
    counts.set(d, row);
  }

  // Build day cells from (today - days + 1) up to today.
  const cells: DayCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const c = counts.get(key) ?? { buys: 0, sells: 0 };
    cells.push({ date: key, buys: c.buys, sells: c.sells, total: c.buys + c.sells });
  }

  if (cells.length === 0) return null;

  // Pad the head so the first column starts on Sunday (UTC day 0).
  const firstDay = new Date(cells[0]!.date + "T00:00:00Z");
  const lead = firstDay.getUTCDay(); // 0=Sun
  const padded: (DayCell | null)[] = [...Array(lead).fill(null), ...cells];
  // Trail-pad to full weeks.
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks = padded.length / 7;
  const totalActivity = cells.reduce((s, c) => s + c.total, 0);
  const max = Math.max(1, ...cells.map((c) => c.total));

  function intensity(total: number): number {
    if (total === 0) return 0;
    if (total === 1) return 1;
    if (total <= max * 0.25) return 2;
    if (total <= max * 0.5) return 3;
    if (total <= max * 0.75) return 4;
    return 5;
  }

  const palette = [
    "fill-zinc-200 dark:fill-zinc-800",
    "fill-emerald-200 dark:fill-emerald-900",
    "fill-emerald-300 dark:fill-emerald-800",
    "fill-emerald-500 dark:fill-emerald-700",
    "fill-emerald-600 dark:fill-emerald-600",
    "fill-emerald-700 dark:fill-emerald-400",
  ];

  const width = weeks * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  // Month labels: place a label at the first column of each new month.
  const monthLabels: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const cell = padded[w * 7];
    if (!cell) continue;
    const m = new Date(cell.date + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        x: w * (CELL + GAP),
        label: new Date(cell.date + "T00:00:00Z").toLocaleString("en", { month: "short" }),
      });
      lastMonth = m;
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="text-xs text-zinc-500 mb-1">
          {totalActivity} sale{totalActivity === 1 ? "" : "s"} in the last {days} days
        </div>
        <svg
          width={width}
          height={height + 18}
          role="img"
          aria-label={`Activity heatmap: ${totalActivity} sales in the last ${days} days`}
        >
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={10}
              className="fill-zinc-500"
              fontSize={10}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {m.label}
            </text>
          ))}
          <g transform="translate(0, 18)">
            {padded.map((cell, idx) => {
              if (!cell) return null;
              const w = Math.floor(idx / 7);
              const d = idx % 7;
              const x = w * (CELL + GAP);
              const y = d * (CELL + GAP);
              const tip = `${cell.date}: ${cell.buys} bought, ${cell.sells} sold`;
              return (
                <rect
                  key={idx}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  className={palette[intensity(cell.total)]}
                >
                  <title>{tip}</title>
                </rect>
              );
            })}
          </g>
        </svg>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500">
          <span>less</span>
          {palette.map((p, i) => (
            <svg key={i} width={CELL} height={CELL}>
              <rect width={CELL} height={CELL} rx={2} className={p} />
            </svg>
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  );
}
