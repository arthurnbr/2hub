import { CircleCheck, CircleDot, GitBranch, GitMerge, GitPullRequest, GitPullRequestClosed, MessageSquare } from "lucide-preact";
import { useState } from "preact/hooks";
import type { GiteaData, GiteaNotification, GiteaPull, Section } from "../../shared/types";
import { relative } from "../format";
import { Dialog, Tile } from "./Tile";

function NotifIcon({ n }: { n: GiteaNotification }) {
  const Icon =
    n.type === "Pull"
      ? n.state === "merged"
        ? GitMerge
        : n.state === "closed"
          ? GitPullRequestClosed
          : GitPullRequest
      : n.type === "Issue"
        ? CircleDot
        : MessageSquare;
  return (
    <span class={`li-icon ${n.state}`}>
      <Icon size={18} />
    </span>
  );
}

function NotifRow({ n }: { n: GiteaNotification }) {
  return (
    <a class="li state" href={n.url} target="_blank" rel="noopener">
      <NotifIcon n={n} />
      <span class="li-main">
        <span class="li-title">{n.title}</span>
        <span class="li-sub">{n.repo}</span>
      </span>
      <span class="li-end">{relative(n.updatedAt)}</span>
    </a>
  );
}

function PullRow({ p }: { p: GiteaPull }) {
  return (
    <a class="li state" href={p.url} target="_blank" rel="noopener">
      <span class="li-icon open">
        <GitPullRequest size={18} />
      </span>
      <span class="li-main">
        <span class="li-title">{p.title}</span>
        <span class="li-sub">
          {p.repo} #{p.number}
        </span>
      </span>
      <span class="li-end">{relative(p.updatedAt)}</span>
    </a>
  );
}

export function GiteaTile({ section, onOpen }: { section: Section<GiteaData> | undefined; onOpen: () => void }) {
  return (
    <Tile title="Gitea" icon={GitBranch} section={section} onOpen={onOpen}>
      {(g) => (
        <>
          <div class="metric">
            <span class="metric-value num">{g.unread}</span>
            <span class="metric-label">non lues</span>
            {g.reviewRequested.length > 0 && <span class="chip primary">{g.reviewRequested.length} reviews</span>}
            {g.mine.length > 0 && <span class="chip">{g.mine.length} PR ouvertes</span>}
          </div>
          {g.notifications.length === 0 ? (
            <div class="empty">
              <CircleCheck size={20} />
              Aucune notification.
            </div>
          ) : (
            <div class="list clip">
              {g.notifications.slice(0, 5).map((n) => (
                <NotifRow key={n.id} n={n} />
              ))}
            </div>
          )}
        </>
      )}
    </Tile>
  );
}

type Tab = "notifs" | "review" | "mine";

export function GiteaDetail({ data: g, onClose }: { data: GiteaData; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(g.reviewRequested.length ? "review" : "notifs");
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "notifs", label: "Notifications", count: g.unread },
    { id: "review", label: "Reviews", count: g.reviewRequested.length },
    { id: "mine", label: "Mes PR", count: g.mine.length },
  ];
  const empty = (text: string) => (
    <div class="empty">
      <CircleCheck size={20} />
      {text}
    </div>
  );
  return (
    <Dialog title="Gitea" href={`${g.url}/notifications`} hrefLabel="git.eduvia.dev" onClose={onClose}>
      <div class="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} class="tab state" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count > 0 && <span class="badge">{t.count > 99 ? "99+" : t.count}</span>}
          </button>
        ))}
      </div>
      <div class="list">
        {tab === "notifs" && (g.notifications.length ? g.notifications.map((n) => <NotifRow key={n.id} n={n} />) : empty("Aucune notification."))}
        {tab === "review" && (g.reviewRequested.length ? g.reviewRequested.map((p) => <PullRow key={p.id} p={p} />) : empty("Aucune review demandée."))}
        {tab === "mine" && (g.mine.length ? g.mine.map((p) => <PullRow key={p.id} p={p} />) : empty("Aucune PR ouverte."))}
      </div>
      {tab === "notifs" && g.unread > g.notifications.length && (
        <a class="btn outlined" href={`${g.url}/notifications`} target="_blank" rel="noopener" style={{ justifySelf: "start" }}>
          Voir les {g.unread} notifications
        </a>
      )}
    </Dialog>
  );
}
