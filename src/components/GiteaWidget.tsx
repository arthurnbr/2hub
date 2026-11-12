import { Bell, CircleDot, GitBranch, GitMerge, GitPullRequest, GitPullRequestClosed, MessageSquare, Sparkles } from "lucide-preact";
import { useState } from "preact/hooks";
import type { GiteaData, GiteaNotification, GiteaPull, Section } from "../../shared/types";
import { relative } from "../format";
import { Card } from "./Card";

type Tab = "notifs" | "review" | "mine";

function NotifIcon({ n }: { n: GiteaNotification }) {
  const cls = `row-icon ${n.state}`;
  if (n.type === "Pull") {
    const Icon = n.state === "merged" ? GitMerge : n.state === "closed" ? GitPullRequestClosed : GitPullRequest;
    return <span class={cls}><Icon size={15} /></span>;
  }
  if (n.type === "Issue") return <span class={cls}><CircleDot size={15} /></span>;
  return <span class={cls}><MessageSquare size={15} /></span>;
}

function PullRow({ p }: { p: GiteaPull }) {
  return (
    <a class="row" href={p.url} target="_blank" rel="noopener" key={p.id}>
      <span class="row-icon open"><GitPullRequest size={15} /></span>
      <span class="row-main">
        <span class="row-title">{p.title}</span>
        <span class="row-meta">{p.repo} #{p.number}</span>
      </span>
      <span class="row-time">{relative(p.updatedAt)}</span>
    </a>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div class="empty">
      <Sparkles size={22} />
      {text}
    </div>
  );
}

export function GiteaWidget({ section }: { section: Section<GiteaData> | undefined }) {
  const [tab, setTab] = useState<Tab>("notifs");
  const d = section?.ok ? section.data : null;
  const tabs: { id: Tab; label: string; count: number | undefined }[] = [
    { id: "notifs", label: "Notifs", count: d?.unread },
    { id: "review", label: "Reviews", count: d?.reviewRequested.length },
    { id: "mine", label: "Mes PR", count: d?.mine.length },
  ];

  return (
    <Card
      class="w-gitea"
      title="Gitea"
      icon={GitBranch}
      href="https://git.eduvia.dev/notifications"
      section={section}
      actions={
        <div class="tabs">
          {tabs.map((t) => (
            <button key={t.id} class={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.count ? <span class="count">{t.count > 99 ? "99+" : t.count}</span> : null}
            </button>
          ))}
        </div>
      }
    >
      {(g) => (
        <div class="list">
          {tab === "notifs" &&
            (g.notifications.length ? (
              g.notifications.map((n) => (
                <a class="row" href={n.url} target="_blank" rel="noopener" key={n.id}>
                  <NotifIcon n={n} />
                  <span class="row-main">
                    <span class="row-title">{n.title}</span>
                    <span class="row-meta">{n.repo}</span>
                  </span>
                  <span class="row-time">{relative(n.updatedAt)}</span>
                </a>
              ))
            ) : (
              <Empty text="Inbox zero 🎉" />
            ))}
          {tab === "review" &&
            (g.reviewRequested.length ? g.reviewRequested.map((p) => <PullRow p={p} key={p.id} />) : <Empty text="Aucune review en attente" />)}
          {tab === "mine" && (g.mine.length ? g.mine.map((p) => <PullRow p={p} key={p.id} />) : <Empty text="Aucune PR ouverte" />)}
          {tab === "notifs" && g.unread > g.notifications.length && (
            <a class="card-link" style={{ marginTop: 8, justifySelf: "start" }} href={`${g.url}/notifications`} target="_blank" rel="noopener">
              <Bell size={13} /> {g.unread - g.notifications.length} autres non lues
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
