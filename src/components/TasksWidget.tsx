import { Check, ListChecks, Plus, Sparkles } from "lucide-preact";
import { useState } from "preact/hooks";
import type { Section, Task, TasksData } from "../../shared/types";
import { api } from "../api";
import { dayLabel, timeOf } from "../format";
import { Card } from "./Card";

type Props = { section: Section<TasksData> | undefined; onChange: () => void; toast: (m: string) => void };

export function TasksWidget({ section, onChange, toast }: Props) {
  // Optimistic: checked tasks flip immediately, then the dashboard refetches.
  const [doneIds, setDoneIds] = useState<Record<number, boolean>>({});
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const toggle = async (t: Task) => {
    const next = !doneIds[t.id];
    setDoneIds((d) => ({ ...d, [t.id]: next }));
    try {
      await api.setDone(t.id, next);
      if (next) toast(`✓ ${t.title}`);
      onChange();
    } catch (e) {
      setDoneIds((d) => ({ ...d, [t.id]: !next }));
      toast(`Erreur : ${e instanceof Error ? e.message : e}`);
    }
  };

  const add = async (e: Event) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setAdding(true);
    try {
      await api.createTask(title);
      setDraft("");
      onChange();
    } catch (err) {
      toast(`Erreur : ${err instanceof Error ? err.message : err}`);
    } finally {
      setAdding(false);
    }
  };

  const row = (t: Task, showDay: boolean) => (
    <div key={t.id} class={`task${doneIds[t.id] ? " done" : ""}`}>
      <button class="check" onClick={() => toggle(t)} aria-label="Terminer">
        <Check size={13} strokeWidth={3} />
      </button>
      <a class="task-main" href={t.url} target="_blank" rel="noopener">
        <span class="task-title">{t.title}</span>
        <span class="task-meta">
          <span class="proj-dot" style={t.project.color ? { background: t.project.color } : undefined} />
          {t.project.title}
          {t.due && <span>· {showDay ? dayLabel(t.due) : timeOf(t.due)}</span>}
        </span>
      </a>
      {t.priority >= 3 && <span class={`prio p${t.priority}`}>P{t.priority}</span>}
    </div>
  );

  return (
    <Card class="w-tasks" title="Aujourd'hui" icon={ListChecks} href="https://todo.nobrega.fr" section={section}>
      {(d) => (
        <>
          <div class="stat-row">
            {d.overdue.length > 0 && <span class="pill bad">{d.overdue.length} en retard</span>}
            <span class="pill accent">{d.today.length} aujourd'hui</span>
            <span class="pill">{d.upcoming.length} cette semaine</span>
            <span class="pill">{d.openCount} ouvertes</span>
          </div>

          {d.overdue.length + d.today.length + d.upcoming.length === 0 ? (
            <div class="empty">
              <Sparkles size={22} />
              Rien de prévu. Profite.
            </div>
          ) : (
            <>
              {d.overdue.length > 0 && (
                <div class="task-group">
                  <h3 class="task-group-title bad">En retard</h3>
                  {d.overdue.slice(0, 5).map((t) => row(t, true))}
                </div>
              )}
              {d.today.length > 0 && (
                <div class="task-group">
                  <h3 class="task-group-title">Aujourd'hui</h3>
                  {d.today.map((t) => row(t, false))}
                </div>
              )}
              {d.upcoming.length > 0 && (
                <div class="task-group">
                  <h3 class="task-group-title">Prochains jours</h3>
                  {d.upcoming.slice(0, 4).map((t) => row(t, true))}
                </div>
              )}
            </>
          )}

          <form class="quick-add" onSubmit={add}>
            <Plus size={16} />
            <input
              value={draft}
              onInput={(e) => setDraft(e.currentTarget.value)}
              placeholder="Ajouter une tâche pour aujourd'hui…"
              disabled={adding}
            />
            {draft && <span class="kbd">↵</span>}
          </form>
        </>
      )}
    </Card>
  );
}
