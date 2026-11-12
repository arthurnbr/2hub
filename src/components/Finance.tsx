import { Eye, EyeOff, Wallet } from "lucide-preact";
import type { BudgetCategory, FinanceData, Section } from "../../shared/types";
import { dayLabel, money } from "../format";
import { Dialog, Tile } from "./Tile";

/** Share of the month elapsed, used to place the "on pace" marker on the budget bar. */
function monthElapsed(d: FinanceData): number {
  const start = new Date(`${d.month.start}T00:00:00`).getTime();
  const end = new Date(`${d.month.end}T23:59:59`).getTime();
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  depository: "Compte courant / épargne",
  investment: "Investissement",
  crypto: "Crypto",
  property: "Immobilier",
  vehicle: "Véhicule",
  credit_card: "Carte de crédit",
  loan: "Prêt",
};

const monthTitle = (start: string) =>
  new Date(`${start}T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function progressClass(spent: number, budget: number, warnAt = 0.85) {
  if (budget <= 0) return spent > 0 ? "over" : "";
  const r = spent / budget;
  return r > 1 ? "over" : r > warnAt ? "warn" : "";
}

function PaceBar({ d, blur }: { d: FinanceData; blur: string }) {
  const ratio = d.budgeted ? d.spent / d.budgeted : 0;
  const elapsed = monthElapsed(d);
  return (
    <div>
      <div class="pace">
        <div class={`progress ${progressClass(d.spent, d.budgeted)}`}>
          <i style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        </div>
        <span class="pace-mark" style={{ left: `calc(${elapsed * 100}% - 1px)` }} title="Rythme prévu à date" />
      </div>
      <div class="pace-legend">
        <span class={blur}>
          {money(d.spent)} / {money(d.budgeted)}
        </span>
        <span>{ratio > elapsed + 0.05 ? "Au-dessus du rythme" : "Dans le rythme"}</span>
      </div>
    </div>
  );
}

function CategoryRow({ c, blur }: { c: BudgetCategory; blur: string }) {
  const pct = c.budgeted ? (c.spent / c.budgeted) * 100 : c.spent ? 100 : 0;
  const cls = progressClass(c.spent, c.budgeted, 0.9);
  return (
    <div class="cat">
      <div class="cat-row">
        <span class="cat-name">
          <span class="dot" style={{ background: c.color }} />
          {c.name}
        </span>
        <span class={`cat-amt num ${blur}`}>
          <b class={cls === "over" ? "over" : ""}>{money(c.spent)}</b>
          {c.budgeted > 0 ? ` / ${money(c.budgeted)}` : " · hors budget"}
        </span>
      </div>
      <div class={`progress thin ${cls}`}>
        <i style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

type Privacy = { hidden: boolean; onTogglePrivacy: () => void };

function PrivacyButton({ hidden, onTogglePrivacy }: Privacy) {
  return (
    <button
      class="icon-btn state"
      aria-pressed={hidden}
      onClick={onTogglePrivacy}
      title={hidden ? "Afficher les montants" : "Masquer les montants"}
      aria-label="Masquer les montants"
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

export function FinanceTile({ section, onOpen, ...privacy }: Privacy & { section: Section<FinanceData> | undefined; onOpen: () => void }) {
  const blur = privacy.hidden ? "privacy" : "";
  return (
    <Tile title="Budget du mois" icon={Wallet} section={section} onOpen={onOpen} aside={<PrivacyButton {...privacy} />}>
      {(d) => {
        const perDay = d.daysLeft > 0 ? Math.max(0, d.available) / d.daysLeft : 0;
        const worst = d.categories
          .filter((c) => c.spent > 0)
          .sort((a, b) => (b.budgeted ? b.spent / b.budgeted : 2) - (a.budgeted ? a.spent / a.budgeted : 2))
          .slice(0, 5);
        return (
          <>
            <div class="metric">
              <span class={`metric-value num ${d.available < 0 ? "negative" : ""} ${blur}`}>{money(d.available)}</span>
              <span class={`metric-label ${blur}`}>
                restants · {money(perDay)}/jour sur {d.daysLeft} j
              </span>
            </div>
            <PaceBar d={d} blur={blur} />
            <div class="clip">
              {worst.map((c) => (
                <CategoryRow key={c.id} c={c} blur={blur} />
              ))}
            </div>
          </>
        );
      }}
    </Tile>
  );
}

/** Cumulative spend, this month vs last month, on a shared day axis. */
function SpendChart({ current, previous }: { current: number[]; previous: number[] }) {
  const w = 640;
  const h = 120;
  const days = Math.max(previous.length, current.length, 28);
  const max = Math.max(1, ...current, ...previous);
  const pts = (arr: number[]) => arr.map((v, i) => `${((i / (days - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 8) - 4).toFixed(1)}`).join(" ");
  return (
    <svg class="spark" viewBox={`0 0 ${w} ${h}`} height={h} preserveAspectRatio="none" role="img" aria-label="Dépenses cumulées">
      <line x1="0" y1={h - 4} x2={w} y2={h - 4} stroke="var(--outline-variant)" vector-effect="non-scaling-stroke" />
      <polyline points={pts(previous)} fill="none" stroke="var(--outline)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
      <polyline points={pts(current)} fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    </svg>
  );
}

export function FinanceDetail({ data: d, onClose, ...privacy }: Privacy & { data: FinanceData; onClose: () => void }) {
  const blur = privacy.hidden ? "privacy" : "";
  const accounts = d.accounts.filter((a) => a.classification === "asset");
  return (
    <Dialog title={`Budget · ${monthTitle(d.month.start)}`} href={d.url} hrefLabel="Sure" onClose={onClose}>
      <div class="metrics-row">
        <div class="metric-sm">
          <span class={`metric-value num ${blur}`}>{money(d.spent)}</span>
          <span class="metric-label">dépensés sur {money(d.budgeted)}</span>
        </div>
        <div class="metric-sm">
          <span class={`metric-value num ${d.available < 0 ? "negative" : "positive"} ${blur}`}>{money(d.available)}</span>
          <span class="metric-label">restants · {d.daysLeft} jours</span>
        </div>
        <div class="metric-sm">
          <span class={`metric-value num ${blur}`}>{money(d.income)}</span>
          <span class="metric-label">revenus · prévu {money(d.expectedIncome)}</span>
        </div>
      </div>
      <PaceBar d={d} blur={blur} />

      <div class="card">
        <div class="cat-row" style={{ marginBottom: 8 }}>
          <div class="legend">
            <span><i />Ce mois</span>
            <span><i class="prev" />Mois dernier</span>
          </div>
          <span class={`num ${d.curve.delta > 0 ? "negative" : "positive"} ${blur}`} style={{ fontSize: 12 }}>
            {d.curve.delta > 0 ? "+" : ""}
            {money(d.curve.delta)} vs même date
          </span>
        </div>
        <SpendChart current={d.curve.current} previous={d.curve.previous} />
      </div>

      <div>
        <div class="section-label">CATÉGORIES</div>
        <div class="grid-2">
          {d.categories.map((c) => (
            <CategoryRow key={c.id} c={c} blur={blur} />
          ))}
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div class="section-label">DERNIÈRES OPÉRATIONS</div>
          <div class="list">
            {d.recent.map((t) => (
              <div class="li" key={t.id}>
                <span class="dot" style={t.category ? { background: t.category.color } : undefined} />
                <span class="li-main">
                  <span class="li-title">{t.name}</span>
                  <span class="li-sub">
                    {t.category?.name ?? "Non catégorisé"} · {dayLabel(t.date)}
                  </span>
                </span>
                <span class={`num ${t.classification === "income" ? "positive" : ""} ${blur}`}>
                  {t.classification === "income" ? "+" : "−"}
                  {money(Math.abs(t.amount), true)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div class="section-label">COMPTES</div>
          <div class="list">
            {accounts.map((a) => (
              <div class="li" key={a.id}>
                <span class="li-main">
                  <span class="li-title">{a.name}</span>
                  <span class="li-sub">{ACCOUNT_TYPE_LABEL[a.type] ?? a.type}</span>
                </span>
                <span class={`num ${blur}`}>{money(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
