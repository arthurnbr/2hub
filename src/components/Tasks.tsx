import { CircleCheck, ListChecks, Plus } from "lucide-preact";
import { useState } from "preact/hooks";
import type { Section, Task, TasksData } from "../../shared/types";
import { api } from "../api";
import { dayLabel, timeOf } from "../format";
import { Dialog, Tile } from "./Tile";

type Common = { onChange: () => void; toast: (m: string) => void };

/** Optimistic done toggling shared by tile and dialog. */
function useDone({ onChange, toast }: Common) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const toggle = async (t: Task) => {
    const next = !done[t.id];
    setDone((d) => ({ ...d, [t.id]: next }));
    try {
      await api.setDone(t.id, next);
      toast(next ? "Tâche terminée" : "Tâche rouverte");
      onChange();
    } catch (e) {
      setDone((d) => ({ ...d, [t.id]: !next }));
      toast(`Échec : ${e instanceof Error ? e.message : e}`);
    }
  };
  return { done, toggle };
}

function TaskRow({ t, done, onToggle, showDay }: { t: Task; done: boolean; onToggle: () => void; showDay: boolean }) {
  return (
    <div class={`li${done ? " done" : ""}`}>
      <button class="checkbox state" role="checkbox" aria-checked={done} aria-label={`Terminer ${t.title}`} onClick={onToggle}>
        <span class="box">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
      </button>
      <a class="li-main" href={t.url} target="_blank" rel="noopener">
        <span class="li-title">{t.title}</span>
        <span class="li-sub">
          {t.project.title}
          {t.due && ` · ${showDay ? dayLabel(t.due) : timeOf(t.due)}`}
        </span>
      </a>
      {t.priority >= 3 && <span class={`chip ${t.priority >= 4 ? "error" : "warning"}`}>P{t.priority}</span>}
    </div>
  );
}

function QuickAdd({ onChange, toast }: Common) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: Event) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setBusy(true);
    try {
      await api.createTask(title);
      setDraft("");
      toast("Tâche ajoutée");
      onChange();
    } catch (err) {
      toast(`Échec : ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form class="text-field" onSubmit={submit}>
      <Plus size={20} color="var(--on-surface-variant)" />
      <input value={draft} onInput={(e) => setDraft(e.currentTarget.value)} placeholder="Ajouter une tâche pour aujourd'hui" disabled={busy} />
    </form>
  );
}

export function TasksTile({ section, onOpen, ...common }: Common & { section: Section<TasksData> | undefined; onOpen: () => void }) {
  const { done, toggle } = useDone(common);
  return (
    <Tile title="Tâches" icon={ListChecks} section={section} onOpen={onOpen}>
      {(d) => {
        const focus = [...d.overdue, ...d.today];
        return (
          <>
            <div class="metric">
              <span class="metric-value num">{d.today.length}</span>
              <span class="metric-label">aujourd'hui</span>
              {d.overdue.length > 0 && <span class="chip error">{d.overdue.length} en retard</span>}
              {d.upcoming.length > 0 && <span class="chip">{d.upcoming.length} cette semaine</span>}
            </div>
            {focus.length === 0 ? (
              <div class="empty">
                <CircleCheck size={20} />
                {d.upcoming.length ? `Rien aujourd'hui. Prochaine : ${d.upcoming[0]?.title}` : "Rien de prévu aujourd'hui."}
              </div>
            ) : (
              <div class="list clip">
                {focus.slice(0, 5).map((t) => (
                  <TaskRow key={t.id} t={t} done={!!done[t.id]} onToggle={() => toggle(t)} showDay={!d.today.includes(t)} />
                ))}
              </div>
            )}
          </>
        );
      }}
    </Tile>
  );
}

export function TasksDetail({ data, onClose, ...common }: Common & { data: TasksData; onClose: () => void }) {
  const { done, toggle } = useDone(common);
  const groups: { label: string; tasks: Task[]; showDay: boolean; error?: boolean }[] = [
    { label: "EN RETARD", tasks: data.overdue, showDay: true, error: true },
    { label: "AUJOURD'HUI", tasks: data.today, showDay: false },
    { label: "7 PROCHAINS JOURS", tasks: data.upcoming, showDay: true },
  ];
  return (
    <Dialog title="Tâches" href="https://todo.nobrega.fr" hrefLabel="Vikunja" onClose={onClose}>
      <QuickAdd {...common} />
      {groups.map(
        (g) =>
          g.tasks.length > 0 && (
            <div key={g.label}>
              <div class={`section-label${g.error ? " error" : ""}`}>{g.label}</div>
              <div class="list">
                {g.tasks.map((t) => (
                  <TaskRow key={t.id} t={t} done={!!done[t.id]} onToggle={() => toggle(t)} showDay={g.showDay} />
                ))}
              </div>
            </div>
          ),
      )}
      {data.overdue.length + data.today.length + data.upcoming.length === 0 && (
        <div class="empty">
          <CircleCheck size={20} />
          Aucune tâche datée cette semaine.
        </div>
      )}
      <div class="li-sub">
        {data.openCount} tâches ouvertes · {data.undatedCount} sans échéance
      </div>
    </Dialog>
  );
}
