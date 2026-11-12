import { Plus, X } from "lucide-preact";
import { useState } from "preact/hooks";
import { ALL_APPS } from "../../shared/apps";
import type { HealthData } from "../../shared/types";
import { AppIcon } from "./AppIcon";

type Props = {
  pinned: string[];
  health: HealthData | null;
  editing: boolean;
  onReorder: (ids: string[]) => void;
  onAdd: () => void;
  onDoneEditing: () => void;
};

/** Pinned apps. Edit mode (from the drawer or a long press) allows remove + drag to reorder. */
export function Shortcuts({ pinned, health, editing, onReorder, onAdd, onDoneEditing }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const apps = pinned.flatMap((id) => ALL_APPS.filter((a) => a.id === id));

  const moveTo = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = pinned.filter((id) => id !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    onReorder(next);
  };

  return (
    <nav class="shortcuts" aria-label="Raccourcis">
      {apps.map((a) =>
        editing ? (
          <div
            key={a.id}
            class={`shortcut state editing${dragId === a.id ? " dragging" : ""}`}
            draggable
            onDragStart={(e) => {
              setDragId(a.id);
              e.dataTransfer?.setData("text/plain", a.id);
            }}
            onDragEnter={() => moveTo(a.id)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => setDragId(null)}
          >
            <AppIcon app={a} />
            <span class="shortcut-label">{a.name}</span>
            <button class="remove" aria-label={`Retirer ${a.name}`} onClick={() => onReorder(pinned.filter((id) => id !== a.id))}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <a key={a.id} class="shortcut state" href={a.url} title={a.hint ? `${a.name} · ${a.hint}` : a.name}>
            <AppIcon app={a} down={health?.[a.id]?.up === false} />
            <span class="shortcut-label">{a.name}</span>
          </a>
        ),
      )}
      <button class="shortcut shortcut-add state" onClick={onAdd} aria-label="Ajouter un raccourci">
        <span class="app-icon">
          <Plus size={22} />
        </span>
        <span class="shortcut-label">Ajouter</span>
      </button>
      {editing && (
        <button class="btn tonal edit-done" onClick={onDoneEditing}>
          Terminé
        </button>
      )}
    </nav>
  );
}
