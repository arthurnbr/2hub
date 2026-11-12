import { z } from "zod";
import type { DeployInstance, DeploysData, Deployment } from "../../shared/types";
import { env } from "../env";
import { fetchJson } from "../http";

const Resource = z.object({
  name: z.string(),
  type: z.string(),
  status: z.string().nullish(),
  fqdn: z.string().nullish(),
});

/** Coolify status is "<state>:<health>"; "running:unknown" means no healthcheck configured. */
const isHealthy = (status: string) => status.startsWith("running") && !status.endsWith(":unhealthy");

export async function loadDeploys(): Promise<DeploysData> {
  const instances = await Promise.all(
    env.coolify
      .filter((i) => i.token)
      .map(async (i): Promise<DeployInstance> => {
        const resources = await fetchJson(`${i.url}/api/v1/resources`, z.array(Resource), {
          headers: { Authorization: `Bearer ${i.token}`, accept: "application/json" },
        });
        const items: Deployment[] = resources.map((r) => ({
          name: r.name.replace(/-[a-z0-9]{24}$/, ""),
          status: r.status ?? "unknown",
          url: r.fqdn?.split(",")[0] ?? null,
          kind: r.type === "service" ? "service" : "app",
        }));
        const problems = items.filter((d) => !isHealthy(d.status));
        return { id: i.id, label: i.label, url: i.url, healthy: items.length - problems.length, total: items.length, problems };
      }),
  );
  if (instances.length === 0) throw new Error("Aucun token Coolify configuré");
  return { instances };
}
