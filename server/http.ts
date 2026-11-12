import type { z } from "zod";

/** Fetches upstream JSON with a timeout and validates it against `schema`. */
export async function fetchJson<S extends z.ZodType>(
  url: string,
  schema: S,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<z.infer<S>> {
  const { timeoutMs = 8000, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${new URL(url).host} ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
  }
  return schema.parse(await res.json());
}

/** Caches a loader's resolved value for `ttlMs`; concurrent callers share one in-flight request. */
export function cached<T>(ttlMs: number, load: () => Promise<T>) {
  let value: { at: number; data: T } | null = null;
  let inflight: Promise<T> | null = null;
  return {
    get(): Promise<T> {
      if (value && Date.now() - value.at < ttlMs) return Promise.resolve(value.data);
      inflight ??= load()
        .then((data) => {
          value = { at: Date.now(), data };
          return data;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    invalidate() {
      value = null;
    },
  };
}
