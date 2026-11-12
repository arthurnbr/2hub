import { ArrowUpRight, ChevronRight, TriangleAlert, X, type LucideIcon } from "lucide-preact";
import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import type { Section } from "../../shared/types";

type TileProps<T> = {
  title: string;
  icon: LucideIcon;
  section: Section<T> | undefined;
  onOpen: () => void;
  aside?: ComponentChildren;
  children: (data: T) => ComponentChildren;
};

/** Summary card on the home grid. Whole tile opens the detail dialog. */
export function Tile<T>({ title, icon: Icon, section, onOpen, aside, children }: TileProps<T>) {
  return (
    <section
      class="tile state"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Inner links and controls keep their own behaviour.
        if (e.target instanceof Element && e.target.closest("a, button, input, form")) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <header class="tile-head">
        <Icon size={20} />
        <h2>{title}</h2>
        <span class="spacer" />
        {aside}
        <span class="more" aria-hidden="true">
          <ChevronRight size={20} />
        </span>
      </header>
      <div class="tile-body">
        {!section ? (
          <>
            <div class="skeleton" style={{ width: "40%", height: 36 }} />
            <div class="skeleton" style={{ width: "85%" }} />
            <div class="skeleton" style={{ width: "65%" }} />
          </>
        ) : section.ok ? (
          children(section.data)
        ) : (
          <div class="tile-error">
            <TriangleAlert size={16} />
            <span>{section.error}</span>
          </div>
        )}
      </div>
    </section>
  );
}

type DialogProps = { title: string; href?: string; hrefLabel?: string; side?: boolean; onClose: () => void; children: ComponentChildren };

export function Dialog({ title, href, hrefLabel = "Ouvrir", side, onClose, children }: DialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div class="scrim" onClick={onClose} />
      <div class={`dialog${side ? " side" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header class="dialog-head">
          <h2>{title}</h2>
          {href && (
            <a class="btn text" href={href} target="_blank" rel="noopener">
              {hrefLabel} <ArrowUpRight size={16} />
            </a>
          )}
          <button class="icon-btn state" onClick={onClose} aria-label="Fermer" autoFocus>
            <X size={20} />
          </button>
        </header>
        <div class="dialog-body">{children}</div>
      </div>
    </>
  );
}
