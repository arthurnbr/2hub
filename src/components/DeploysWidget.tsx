import { ArrowUpRight, ServerCog } from "lucide-preact";
import type { DeploysData, Section } from "../../shared/types";
import { Card } from "./Card";

export function DeploysWidget({ section }: { section: Section<DeploysData> | undefined }) {
  return (
    <Card class="w-deploys" title="Déploiements" icon={ServerCog} section={section}>
      {(d) => (
        <div class="instances">
          {d.instances.map((i) => (
            <div class="instance" key={i.id}>
              <div class="instance-head">
                <span class="instance-name">Coolify · {i.label}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span class={`pill ${i.problems.length ? "bad" : ""}`}>
                    {i.healthy}/{i.total} OK
                  </span>
                  <a class="card-link" href={i.url} target="_blank" rel="noopener">
                    <ArrowUpRight size={13} />
                  </a>
                </span>
              </div>
              <div class="meter">
                {Array.from({ length: i.total }, (_, k) => (
                  <i key={k} class={k >= i.healthy ? "bad" : ""} />
                ))}
              </div>
              {i.problems.slice(0, 5).map((p) => (
                <div class="problem" key={p.name}>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener">{p.name}</a>
                  ) : (
                    <span>{p.name}</span>
                  )}
                  <span class={`status ${p.status.startsWith("running") ? "warn" : ""}`}>{p.status}</span>
                </div>
              ))}
              {i.problems.length > 5 && (
                <a class="card-link" style={{ marginTop: 6, paddingLeft: 0 }} href={i.url} target="_blank" rel="noopener">
                  +{i.problems.length - 5} autres
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
