import { Search } from "lucide-preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { APP_GROUPS, ALL_APPS, type App } from "../../shared/apps";
import type { HealthData } from "../../shared/types";
import { APP_ICONS } from "../icons";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function score(app: App, q: string): number {
  const name = norm(app.name);
  if (name.startsWith(q)) return 3;
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  return norm(`${app.name} ${app.hint ?? ""} ${app.keywords ?? ""} ${app.url}`).includes(q) ? 1 : 0;
}

function open(url: string, newTab: boolean) {
  if (newTab) window.open(url, "_blank", "noopener");
  else window.location.href = url;
}

export function Launcher({ health }: { health: HealthData | null }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const q = norm(query.trim());
  const matches = useMemo(
    () =>
      q
        ? ALL_APPS.map((a) => ({ a, s: score(a, q) }))
            .filter((x) => x.s > 0)
            .sort((x, y) => y.s - x.s)
            .map((x) => x.a)
        : [],
    [q],
  );
  const selected = matches[Math.min(cursor, matches.length - 1)];

  // Typing anywhere on the page goes to the launcher; "/" focuses it explicitly.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/" || (e.key.length === 1 && /\S/.test(e.key))) {
        input.current?.focus();
        if (e.key === "/") e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    const newTab = e.metaKey || e.ctrlKey;
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey && matches.length)) {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(matches.length, 1));
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey && matches.length)) {
      e.preventDefault();
      setCursor((c) => (c - 1 + matches.length) % Math.max(matches.length, 1));
    } else if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      if (selected) open(selected.url, newTab);
      else if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(query.trim())) open(`https://${query.trim()}`, newTab);
      else open(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`, newTab);
    } else if (e.key === "Escape") {
      setQuery("");
      input.current?.blur();
    }
  };

  return (
    <>
      <label class="search">
        <Search size={18} color="var(--muted)" />
        <input
          ref={input}
          value={query}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={"Ouvrir une app, une URL ou chercher…"}
          aria-label="Lanceur"
          autoComplete="off"
          spellcheck={false}
        />
        {query ? (
          <span class="kbd">{selected ? "↵ ouvrir" : "↵ web"}</span>
        ) : (
          <span class="kbd">/</span>
        )}
      </label>
      <Groups health={health} matches={q ? matches : null} selected={selected} />
    </>
  );
}

function Groups({ health, matches, selected }: { health: HealthData | null; matches: App[] | null; selected?: App }) {
  return (
    <div class="groups" id="launcher">
      {APP_GROUPS.map((g) => (
        <section key={g.id}>
          <h2 class="group-title">{g.title}</h2>
          <div class="apps">
            {g.apps.map((a) => {
              const Icon = APP_ICONS[a.icon];
              const h = health?.[a.id];
              return (
                <a
                  key={a.id}
                  href={a.url}
                  class={`app${matches && !matches.includes(a) ? " dim" : ""}${selected?.id === a.id ? " selected" : ""}`}
                  style={{ "--h": a.hue }}
                  data-mono={a.hue === 0 ? "" : undefined}
                  title={h ? `${a.url} · ${h.up ? `${h.ms} ms` : "injoignable"}` : a.url}
                >
                  <span class="app-icon">{Icon ? <Icon size={20} strokeWidth={2} /> : a.name[0]}</span>
                  <span class="app-text">
                    <span class="app-name">{a.name}</span>
                    {a.hint && <span class="app-hint">{a.hint}</span>}
                  </span>
                  {h && <span class={`app-dot ${h.up ? "up" : "down"}`} />}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
