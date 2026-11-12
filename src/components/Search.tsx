import { Globe, Search as SearchIcon } from "lucide-preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ALL_APPS, type App } from "../../shared/apps";
import { AppIcon } from "./AppIcon";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const DOMAIN = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/;
const MAX_RESULTS = 6;

function score(app: App, q: string): number {
  const name = norm(app.name);
  if (name.startsWith(q)) return 3;
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  return norm(`${app.hint ?? ""} ${app.keywords ?? ""} ${app.url}`).includes(q) ? 1 : 0;
}

type Result = { kind: "app"; app: App } | { kind: "url"; url: string } | { kind: "web"; query: string };

function go(r: Result, newTab: boolean) {
  const url = r.kind === "app" ? r.app.url : r.kind === "url" ? r.url : `https://www.google.com/search?q=${encodeURIComponent(r.query)}`;
  if (newTab) window.open(url, "_blank", "noopener");
  else window.location.href = url;
}

/** Omnibox: apps first, then a direct URL or a web search. Typing anywhere on the page focuses it. */
export function Search() {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const q = norm(query.trim());

  const results = useMemo<Result[]>(() => {
    if (!q) return [];
    const apps: Result[] = ALL_APPS.map((a) => ({ a, s: score(a, q) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, MAX_RESULTS)
      .map((x) => ({ kind: "app", app: x.a }));
    const raw = query.trim();
    const tail: Result = DOMAIN.test(raw) ? { kind: "url", url: `https://${raw}` } : { kind: "web", query: raw };
    return [...apps, tail];
  }, [q, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector(".dialog, .drawer")) return;
      if (e.key === "/" || (e.key.length === 1 && /\S/.test(e.key))) {
        input.current?.focus();
        if (e.key === "/") e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!results.length) {
      if (e.key === "Escape") input.current?.blur();
      return;
    }
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[cursor];
      if (r) go(r, e.metaKey || e.ctrlKey);
    } else if (e.key === "Escape") {
      setQuery("");
      input.current?.blur();
    }
  };

  return (
    <div class={`search${results.length ? " open" : ""}`}>
      <label class="search-field">
        <SearchIcon size={20} />
        <input
          ref={input}
          value={query}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setQuery(""), 150)}
          placeholder="Rechercher une app, une adresse ou sur le web"
          aria-label="Rechercher"
          aria-expanded={results.length > 0}
          aria-controls="search-menu"
          role="combobox"
          autoComplete="off"
          spellcheck={false}
        />
        {!query && <span class="kbd">/</span>}
      </label>
      {results.length > 0 && (
        <div class="search-menu" id="search-menu" role="listbox">
          {results.map((r, i) => (
            <button
              key={r.kind === "app" ? r.app.id : r.kind}
              class="menu-item state"
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r, e.metaKey || e.ctrlKey);
              }}
            >
              {r.kind === "app" ? (
                <>
                  <AppIcon app={r.app} size="sm" />
                  <span class="grow">
                    {r.app.name}
                    <span class="muted">{r.app.hint}</span>
                  </span>
                </>
              ) : (
                <>
                  <span class="web">{r.kind === "url" ? <Globe size={18} /> : <SearchIcon size={18} />}</span>
                  <span class="grow">
                    {r.kind === "url" ? r.url : `Rechercher « ${r.query} »`}
                    <span class="muted">{r.kind === "url" ? "Ouvrir l'adresse" : "Google"}</span>
                  </span>
                </>
              )}
              {i === cursor && <span class="kbd">↵</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
