import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { ALL_APPS, DEFAULT_PINNED } from "../shared/apps";
import type { Dashboard, Prefs, Section } from "../shared/types";
import { db } from "./db";
import { auth, requireAuth, sameOrigin, session } from "./auth";
import { env } from "./env";
import { cached } from "./http";
import { loadDeploys } from "./sources/deploys";
import { loadFinance } from "./sources/finance";
import { loadGitea } from "./sources/gitea";
import { loadHealth } from "./sources/health";
import { createTask, loadTasks, setTaskDone } from "./sources/tasks";

const sources = {
  tasks: cached(30_000, loadTasks),
  finance: cached(5 * 60_000, loadFinance),
  gitea: cached(60_000, loadGitea),
  deploys: cached(60_000, loadDeploys),
  health: cached(60_000, loadHealth),
};

/** One failing upstream must not blank the dashboard: each section reports its own error. */
async function section<T>(p: Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    console.error("[dashboard]", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const app = new Hono();

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
    crossOriginEmbedderPolicy: false,
  }),
);

const api = new Hono();
api.use("*", sameOrigin, session);
api.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});
api.route("/auth", auth);

api.get("/dashboard", requireAuth, async (c) => {
  if (c.req.query("fresh") === "1") Object.values(sources).forEach((s) => s.invalidate());
  const [tasks, finance, gitea, deploys, health] = await Promise.all([
    section(sources.tasks.get()),
    section(sources.finance.get()),
    section(sources.gitea.get()),
    section(sources.deploys.get()),
    section(sources.health.get()),
  ]);
  const body: Dashboard = { generatedAt: new Date().toISOString(), tasks, finance, gitea, deploys, health };
  return c.json(body);
});

const DoneBody = z.object({ done: z.boolean() });
api.post("/tasks/:id/done", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const body = DoneBody.safeParse(await c.req.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) return c.json({ error: "bad request" }, 400);
  await setTaskDone(id, body.data.done);
  sources.tasks.invalidate();
  return c.json({ ok: true });
});

const CreateBody = z.object({ title: z.string().trim().min(1).max(250), today: z.boolean().default(true) });
api.post("/tasks", requireAuth, async (c) => {
  const body = CreateBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "bad request" }, 400);
  await createTask(body.data.title, body.data.today);
  sources.tasks.invalidate();
  return c.json({ ok: true });
});

const PINNED_KEY = "pinned";
const PinnedBody = z.object({ pinned: z.array(z.string().max(64)).max(24) });
const pinnedQuery = db.query<{ value: string }, [string]>("SELECT value FROM prefs WHERE key = ?");

api.get("/prefs", requireAuth, (c) => {
  const row = pinnedQuery.get(PINNED_KEY);
  const prefs: Prefs = { pinned: row ? PinnedBody.shape.pinned.parse(JSON.parse(row.value)) : DEFAULT_PINNED };
  return c.json(prefs);
});

api.put("/prefs", requireAuth, async (c) => {
  const body = PinnedBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "bad request" }, 400);
  const known = body.data.pinned.filter((id) => ALL_APPS.some((a) => a.id === id));
  db.query("INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    PINNED_KEY,
    JSON.stringify(known),
  );
  const prefs: Prefs = { pinned: known };
  return c.json(prefs);
});

api.onError((e, c) => {
  console.error("[api]", e);
  return c.json({ error: e.message }, 502);
});

app.route("/api", api);
app.get("/healthz", (c) => c.text("ok"));

// Static PWA shell. Hashed assets are immutable; the shell + service worker must revalidate.
app.use(
  "/assets/*",
  async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  },
  serveStatic({ root: "./dist" }),
);
app.use("*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

console.log(`2hub listening on :${env.port} (origin ${env.origin})`);

export default { port: env.port, fetch: app.fetch };
