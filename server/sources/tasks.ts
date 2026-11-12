import { z } from "zod";
import type { Task, TasksData } from "../../shared/types";
import { env } from "../env";
import { fetchJson } from "../http";

// Vikunja encodes "no due date" as the zero time.
const NO_DATE = "0001-01-01T00:00:00Z";
const PAGE_SIZE = 50; // instance max_items_per_page
const MAX_PAGES = 6;

const VTask = z.object({
  id: z.number(),
  title: z.string(),
  done: z.boolean(),
  due_date: z.string(),
  priority: z.number(),
  project_id: z.number(),
});
const VProject = z.object({ id: z.number(), title: z.string(), hex_color: z.string() });

function vikunjaInit(extra: RequestInit = {}): RequestInit {
  if (!env.vikunja.token) throw new Error("VIKUNJA_TOKEN non configuré");
  return { ...extra, headers: { Authorization: `Bearer ${env.vikunja.token}`, "content-type": "application/json" } };
}

/** YYYY-MM-DD of `d` in the hub's time zone. */
const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: env.timeZone });

export async function loadTasks(): Promise<TasksData> {
  const base = `${env.vikunja.url}/api/v1`;
  const init = vikunjaInit();
  const projects = await fetchJson(`${base}/projects`, z.array(VProject), init);
  const byId = new Map(projects.map((p) => [p.id, p]));

  const open: z.infer<typeof VTask>[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const q = new URLSearchParams({ filter: "done = false", per_page: String(PAGE_SIZE), page: String(page), sort_by: "due_date" });
    const batch = await fetchJson(`${base}/tasks?${q}`, z.array(VTask), init);
    open.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  const today = dayKey(new Date());
  const horizon = dayKey(new Date(Date.now() + 7 * 86_400_000));
  const data: TasksData = { overdue: [], today: [], upcoming: [], undatedCount: 0, openCount: open.length };

  for (const t of open) {
    const project = byId.get(t.project_id);
    const due = t.due_date === NO_DATE ? null : t.due_date;
    const task: Task = {
      id: t.id,
      title: t.title,
      due,
      priority: t.priority,
      done: t.done,
      project: { id: t.project_id, title: project?.title ?? "?", color: project?.hex_color ? `#${project.hex_color}` : null },
      url: `${env.vikunja.url}/tasks/${t.id}`,
    };
    if (!due) {
      data.undatedCount++;
      continue;
    }
    const day = dayKey(new Date(due));
    if (day < today) data.overdue.push(task);
    else if (day === today) data.today.push(task);
    else if (day <= horizon) data.upcoming.push(task);
  }

  const byDueThenPriority = (a: Task, b: Task) => (a.due ?? "").localeCompare(b.due ?? "") || b.priority - a.priority;
  data.overdue.sort(byDueThenPriority);
  data.today.sort((a, b) => b.priority - a.priority || (a.due ?? "").localeCompare(b.due ?? ""));
  data.upcoming.sort(byDueThenPriority);
  return data;
}

export async function setTaskDone(id: number, done: boolean): Promise<void> {
  const url = `${env.vikunja.url}/api/v1/tasks/${id}`;
  // Vikunja's POST replaces the whole task: send it back complete with only `done` changed.
  const current = await fetchJson(url, z.record(z.string(), z.unknown()), vikunjaInit());
  await fetchJson(url, z.unknown(), vikunjaInit({ method: "POST", body: JSON.stringify({ ...current, done }) }));
}

export async function createTask(title: string, dueToday: boolean): Promise<void> {
  const body: Record<string, unknown> = { title };
  if (dueToday) {
    // 18:00 local time today, expressed as an absolute instant.
    const local = new Date(new Date().toLocaleString("en-US", { timeZone: env.timeZone }));
    const offsetMs = Date.now() - local.getTime();
    local.setHours(18, 0, 0, 0);
    body.due_date = new Date(local.getTime() + offsetMs).toISOString();
  }
  await fetchJson(
    `${env.vikunja.url}/api/v1/projects/${env.vikunja.inbox}/tasks`,
    z.unknown(),
    vikunjaInit({ method: "PUT", body: JSON.stringify(body) }),
  );
}
