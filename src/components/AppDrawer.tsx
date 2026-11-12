import { Check, Pencil, X } from "lucide-preact";
import { useEffect } from "preact/hooks";
import { APP_GROUPS } from "../../shared/apps";
import type { HealthData } from "../../shared/types";
import { AppIcon } from "./AppIcon";

type Props = {
  pinned: string[];
  health: HealthData | null;
  /** Pick mode: clicking toggles the shortcut instead of opening the app. */
  picking: boolean;
  onTogglePin: (id: string) => void;
  onEditShortcuts: () => void;
  onClose: () => void;
};

export function AppDrawer({ pinned, health, picking, onTogglePin, onEditShortcuts, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div class="drawer-scrim" onClick={onClose} />
      <div class="drawer" role="dialog" aria-label="Toutes les apps">
        <div class="drawer-head">
          <h2>{picking ? "Choisir les raccourcis" : "Toutes les apps"}</h2>
          <span style={{ display: "flex" }}>
            {!picking && (
              <button class="icon-btn state" onClick={onEditShortcuts} title="Modifier les raccourcis" aria-label="Modifier les raccourcis">
                <Pencil size={18} />
              </button>
            )}
            <button class="icon-btn state" onClick={onClose} aria-label="Fermer">
              <X size={20} />
            </button>
          </span>
        </div>
        {picking && <div class="drawer-hint">Touche une app pour l'ajouter ou la retirer de la barre.</div>}
        <div class="drawer-body">
          {APP_GROUPS.map((g) => (
            <section class="drawer-group" key={g.id}>
              <h3>{g.title}</h3>
              <div class="drawer-grid">
                {g.apps.map((a) => {
                  const isPinned = pinned.includes(a.id);
                  const content = (
                    <>
                      <AppIcon app={a} down={health?.[a.id]?.up === false} />
                      <span class="shortcut-label">{a.name}</span>
                      {picking && isPinned && (
                        <span class="pin">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </>
                  );
                  return picking ? (
                    <button
                      key={a.id}
                      class={`drawer-app state${isPinned ? " pinned" : ""}`}
                      aria-pressed={isPinned}
                      onClick={() => onTogglePin(a.id)}
                    >
                      {content}
                    </button>
                  ) : (
                    <a key={a.id} class="drawer-app state" href={a.url} title={a.hint}>
                      {content}
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
