import { Eye, EyeOff, Wallet } from "lucide-preact";
import { useState } from "preact/hooks";
import type { FinanceData, Section } from "../../shared/types";
import { dayLabel, money } from "../format";
import { Card } from "./Card";

const PRIVACY_KEY = "2hub:privacy";

function Ring({ ratio, color }: { ratio: number; color: string }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color={color} />
          <stop offset="100%" stop-color="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle class="ring-track" cx="68" cy="68" r={r} fill="none" stroke-width="12" />
      <circle
        class="ring-value"
        cx="68"
        cy="68"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        stroke-width="12"
        stroke-dasharray={c}
        stroke-dashoffset={c * (1 - Math.min(ratio, 1))}
      />
    </svg>
  );
}

/** Cumulative spend curve: this month (solid) vs last month (dashed), same x scale. */
function Spark({ current, previous }: { current: number[]; previous: number[] }) {
  const w = 600;
  const h = 70;
  const days = Math.max(previous.length, current.length, 28);
  const max = Math.max(1, ...current, ...previous);
  const pts = (arr: number[]) =>
    arr.map((v, i) => `${((i / (days - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`).join(" ");
  const last = current.length - 1;
  const lastX = (last / (days - 1)) * w;
  const lastY = h - ((current[last] ?? 0) / max) * (h - 6) - 3;
  return (
    <svg class="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts(previous)} fill="none" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
      {current.length > 1 && (
        <>
          <polygon points={`0,${h} ${pts(current)} ${lastX.toFixed(1)},${h}`} fill="url(#sparkFill)" />
          <polyline points={pts(current)} fill="none" stroke="var(--accent)" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
          <circle cx={lastX} cy={lastY} r="3.5" fill="var(--accent)" />
        </>
      )}
    </svg>
  );
}

export function FinanceWidget({ section }: { section: Section<FinanceData> | undefined }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem(PRIVACY_KEY) === "1");
  const togglePrivacy = () => {
    localStorage.setItem(PRIVACY_KEY, hidden ? "0" : "1");
    setHidden(!hidden);
  };
  const blur = hidden ? "privacy" : "";

  return (
    <Card
      class="w-finance"
      title="Dépenses du mois"
      icon={Wallet}
      href="https://finance.nobrega.fr"
      section={section}
      actions={
        <button class="card-link" onClick={togglePrivacy} title="Masquer les montants">
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      }
    >
      {(d) => {
        const ratio = d.budgeted ? d.spent / d.budgeted : 0;
        const ringColor = ratio > 1 ? "var(--bad)" : ratio > 0.85 ? "var(--warn)" : "var(--accent)";
        const perDay = d.daysLeft > 0 ? Math.max(0, d.available) / d.daysLeft : 0;
        const deltaPrev = d.curve.delta;
        return (
          <>
            <div class="fin-hero">
              <div class="ring">
                <Ring ratio={ratio} color={ringColor} />
                <div class={`ring-center ${blur}`}>
                  <span class="big">{Math.round(ratio * 100)}%</span>
                  <span class="small">du budget</span>
                </div>
              </div>
              <div>
                <div class="kpis">
                  <div class="kpi">
                    <div class="kpi-label">Dépensé</div>
                    <div class={`kpi-value ${blur}`}>{money(d.spent)}</div>
                    <div class={`kpi-sub ${blur}`}>sur {money(d.budgeted)}</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Reste</div>
                    <div class={`kpi-value ${d.available < 0 ? "bad" : "good"} ${blur}`}>{money(d.available)}</div>
                    <div class={`kpi-sub ${blur}`}>{d.daysLeft > 0 ? `${money(perDay)}/jour · ${d.daysLeft} j` : "fin du mois"}</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi-label">Revenus</div>
                    <div class={`kpi-value ${blur}`}>{money(d.income)}</div>
                    <div class={`kpi-sub ${blur}`}>prévu {money(d.expectedIncome)}</div>
                  </div>
                </div>
                <Spark current={d.curve.current} previous={d.curve.previous} />
                <div class="spark-legend">
                  <span>Ce mois</span>
                  <span class="prev">Mois dernier</span>
                  <span style={{ marginLeft: "auto" }} class={`${deltaPrev > 0 ? "bad" : "good"} ${blur}`}>
                    {deltaPrev > 0 ? "+" : ""}
                    {money(deltaPrev)} vs même date
                  </span>
                </div>
              </div>
            </div>

            <div class="cats">
              {d.categories.slice(0, 8).map((c) => {
                const pct = c.budgeted ? (c.spent / c.budgeted) * 100 : c.spent ? 100 : 0;
                const over = c.budgeted > 0 ? c.spent > c.budgeted : c.spent > 0;
                return (
                  <div key={c.id}>
                    <div class="cat-row">
                      <span class="cat-name">
                        <span class="proj-dot" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span class={`cat-amt ${blur}`}>
                        <b class={over ? "bad" : ""}>{money(c.spent)}</b>
                        {c.budgeted > 0 ? ` / ${money(c.budgeted)}` : " · hors budget"}
                      </span>
                    </div>
                    <div class={`bar${over ? " over" : ""}`}>
                      <i style={{ width: `${Math.min(pct, 100)}%`, background: over ? "var(--bad)" : c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 class="sub-title">Dernières opérations</h3>
            <div class="txns">
              {d.recent.slice(0, 5).map((t) => (
                <div class="txn" key={t.id}>
                  <div style={{ minWidth: 0 }}>
                    <div class="txn-name">{t.name}</div>
                    <div class="txn-meta">
                      {t.category && <span class="proj-dot" style={{ background: t.category.color }} />}
                      {t.category?.name ?? "Non catégorisé"} · {t.account} · {dayLabel(t.date)}
                    </div>
                  </div>
                  <div class={`txn-amt ${t.classification === "income" ? "in" : ""} ${blur}`}>
                    {t.classification === "income" ? "+" : "−"}
                    {money(Math.abs(t.amount), true)}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }}
    </Card>
  );
}
