import { z } from "zod";
import type { GiteaData, GiteaPull } from "../../shared/types";
import { env } from "../env";
import { fetchJson } from "../http";

const Notification = z.object({
  id: z.number(),
  unread: z.boolean(),
  updated_at: z.string(),
  repository: z.object({ full_name: z.string() }),
  subject: z.object({ title: z.string(), type: z.string(), state: z.string().nullish(), html_url: z.string() }),
});
const Issue = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  html_url: z.string(),
  updated_at: z.string(),
  repository: z.object({ full_name: z.string() }),
});

const toPull = (i: z.infer<typeof Issue>): GiteaPull => ({
  id: i.id,
  number: i.number,
  title: i.title,
  url: i.html_url,
  repo: i.repository.full_name,
  updatedAt: i.updated_at,
});

export async function loadGitea(): Promise<GiteaData> {
  if (!env.gitea.token) throw new Error("GITEA_TOKEN non configuré");
  const base = `${env.gitea.url}/api/v1`;
  const init = { headers: { Authorization: `token ${env.gitea.token}`, accept: "application/json" } };
  const [count, notifications, review, mine] = await Promise.all([
    fetchJson(`${base}/notifications/new`, z.object({ new: z.number() }), init),
    fetchJson(`${base}/notifications?status-types=unread&limit=8`, z.array(Notification), init),
    fetchJson(`${base}/repos/issues/search?type=pulls&state=open&review_requested=true&limit=6`, z.array(Issue), init),
    fetchJson(`${base}/repos/issues/search?type=pulls&state=open&created=true&limit=6`, z.array(Issue), init),
  ]);
  return {
    unread: count.new,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.subject.title,
      type: n.subject.type,
      state: n.subject.state ?? "",
      repo: n.repository.full_name,
      url: n.subject.html_url,
      updatedAt: n.updated_at,
    })),
    reviewRequested: review.map(toPull),
    mine: mine.map(toPull),
    url: env.gitea.url,
  };
}
