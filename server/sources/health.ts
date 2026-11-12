import { ALL_APPS } from "../../shared/apps";
import type { HealthData } from "../../shared/types";

/** HEAD-less reachability check: any HTTP answer below 500 counts as up (login redirects included). */
export async function loadHealth(): Promise<HealthData> {
  const entries = await Promise.all(
    ALL_APPS.map(async (app) => {
      const started = performance.now();
      try {
        const res = await fetch(app.url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
        await res.body?.cancel();
        return [app.id, { up: res.status < 500, ms: Math.round(performance.now() - started) }] as const;
      } catch {
        return [app.id, { up: false, ms: null }] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
