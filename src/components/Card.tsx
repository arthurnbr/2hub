import { ArrowUpRight, TriangleAlert, type LucideIcon } from "lucide-preact";
import type { ComponentChildren } from "preact";
import type { Section } from "../../shared/types";

type Props<T> = {
  class: string;
  title: string;
  icon: LucideIcon;
  href?: string;
  actions?: ComponentChildren;
  section: Section<T> | undefined;
  children: (data: T) => ComponentChildren;
};

/** Widget frame: skeleton until the first payload, inline error per section. */
export function Card<T>({ class: cls, title, icon: Icon, href, actions, section, children }: Props<T>) {
  return (
    <article class={`card ${cls}`}>
      <header class="card-head">
        <div class="card-title">
          <span class="badge-icon">
            <Icon size={16} />
          </span>
          {title}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actions}
          {href && (
            <a class="card-link" href={href} target="_blank" rel="noopener">
              Ouvrir <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      </header>
      {!section ? (
        <>
          <div class="skeleton" style={{ width: "70%" }} />
          <div class="skeleton" style={{ width: "90%" }} />
          <div class="skeleton" style={{ width: "55%" }} />
        </>
      ) : section.ok ? (
        children(section.data)
      ) : (
        <div class="card-error">
          <TriangleAlert size={16} />
          <span>{section.error}</span>
        </div>
      )}
    </article>
  );
}
