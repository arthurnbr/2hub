import { CircleCheck, ServerCog } from "lucide-preact";
import { ALL_APPS } from "../../shared/apps";
import type { DeploysData, Deployment, HealthData, Section } from "../../shared/types";
import { AppIcon } from "./AppIcon";
import { Dialog, Tile } from "./Tile";

function StatusChip({ status }: { status: string }) {
  return <span class={`chip ${status.startsWith("running") ? "warning" : "error"}`}>{status.replace(":", " · ")}</span>;
}

function ProblemRow({ p }: { p: Deployment }) {
  const body = (
    <>
      <span class="li-main">
        <span class="li-title">{p.name}</span>
        <span class="li-sub">{p.kind === "service" ? "Service" : "Application"}</span>
      </span>
      <StatusChip status={p.status} />
    </>
  );
  return p.url ? (
    <a class="li state" href={p.url} target="_blank" rel="noopener">
      {body}
    </a>
  ) : (
    <div class="li">{body}</div>
  );
}

type Props = { section: Section<DeploysData> | undefined; health: HealthData | null };

export function DeploysTile({ section, health, onOpen }: Props & { onOpen: () => void }) {
  const downApps = health ? ALL_APPS.filter((a) => health[a.id]?.up === false) : [];
  return (
    <Tile title="Infra" icon={ServerCog} section={section} onOpen={onOpen}>
      {(d) => {
        const total = d.instances.reduce((n, i) => n + i.total, 0);
        const healthy = d.instances.reduce((n, i) => n + i.healthy, 0);
        const problems = d.instances.flatMap((i) => i.problems.map((p) => ({ ...p, instance: i.label })));
        return (
          <>
            <div class="metric">
              <span class="metric-value num">
                {healthy}/{total}
              </span>
              <span class="metric-label">ressources saines</span>
              {downApps.length > 0 && <span class="chip error">{downApps.length} app injoignable</span>}
            </div>
            {d.instances.map((i) => (
              <div class="instance" key={i.id}>
                <div class="instance-head">
                  <span class="li-sub">Coolify {i.label}</span>
                  <span class="li-sub num">
                    {i.healthy}/{i.total}
                  </span>
                </div>
                <div class="meter" aria-hidden="true">
                  {Array.from({ length: i.total }, (_, k) => (
                    <i key={k} class={k >= i.healthy ? "bad" : ""} />
                  ))}
                </div>
              </div>
            ))}
            {problems.length === 0 ? (
              <div class="empty">
                <CircleCheck size={20} />
                Tout tourne.
              </div>
            ) : (
              <div class="li-sub">
                En échec : {problems.slice(0, 3).map((p) => p.name).join(", ")}
                {problems.length > 3 && ` +${problems.length - 3}`}
              </div>
            )}
          </>
        );
      }}
    </Tile>
  );
}

export function DeploysDetail({ data, health, onClose }: { data: DeploysData; health: HealthData | null; onClose: () => void }) {
  const apps = health ? ALL_APPS.map((a) => ({ a, h: health[a.id] })) : [];
  return (
    <Dialog title="Infra" onClose={onClose}>
      {data.instances.map((i) => (
        <div key={i.id}>
          <div class="instance-head">
            <div class="section-label">COOLIFY {i.label.toUpperCase()}</div>
            <a class="btn text" href={i.url} target="_blank" rel="noopener">
              {i.healthy}/{i.total} OK · Ouvrir
            </a>
          </div>
          {i.problems.length === 0 ? (
            <div class="empty">
              <CircleCheck size={20} />
              Toutes les ressources sont saines.
            </div>
          ) : (
            <div class="list">
              {i.problems.map((p) => (
                <ProblemRow key={p.name} p={p} />
              ))}
            </div>
          )}
        </div>
      ))}
      {apps.length > 0 && (
        <div>
          <div class="section-label">DISPONIBILITÉ DES APPS</div>
          <div class="grid-2">
            {apps.map(({ a, h }) => (
              <a class="li state" key={a.id} href={a.url} target="_blank" rel="noopener">
                <AppIcon app={a} size="sm" />
                <span class="li-main">
                  <span class="li-title">{a.name}</span>
                </span>
                <span class={`li-end num ${h?.up ? "" : "negative"}`}>{h ? (h.up ? `${h.ms} ms` : "injoignable") : "—"}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
