import { TZKT_API } from "@/lib/constants";

const MAX_CONCURRENT = 6;
const MIN_INTERVAL_MS = 100;

let active = 0;
let lastDispatch = 0;
const queue: Array<() => void> = [];

function schedule(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const now = Date.now();
    const wait = Math.max(0, lastDispatch + MIN_INTERVAL_MS - now);
    const next = queue.shift()!;
    active++;
    lastDispatch = now + wait;
    if (wait > 0) {
      setTimeout(next, wait);
    } else {
      next();
    }
  }
}

function throttle<T>(run: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
      run()
        .then(resolve, reject)
        .finally(() => {
          active--;
          schedule();
        });
    });
    schedule();
  });
}

export class TzktError extends Error {
  constructor(public status: number, message: string, public url: string) {
    super(message);
    this.name = "TzktError";
  }
}

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const url = new URL(`${TZKT_API}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function tzktFetch<T>(
  path: string,
  params?: Record<string, QueryValue>,
  init?: RequestInit,
): Promise<T> {
  const url = buildUrl(path, params);
  return throttle(async () => {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      next: { revalidate: 30, ...(init && "next" in init ? (init as { next?: object }).next : {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new TzktError(res.status, `TzKT ${res.status}: ${text.slice(0, 200)}`, url);
    }
    return (await res.json()) as T;
  });
}
