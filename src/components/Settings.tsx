import { FingerprintPattern, LogOut, Plus, Trash2 } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Passkey } from "../../shared/types";
import { api } from "../api";
import { relative } from "../format";
import { Dialog } from "./Tile";

type Props = { onClose: () => void; onLogout: () => void; toast: (m: string) => void };

// SQLite datetime('now') is UTC without a zone marker.
const sqliteUtc = (s: string) => `${s.replace(" ", "T")}Z`;

export function Settings({ onClose, onLogout, toast }: Props) {
  const [keys, setKeys] = useState<Passkey[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => api.passkeys().then(setKeys, (e: Error) => toast(e.message));
  useEffect(() => {
    reload();
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      await reload();
    } catch (e) {
      toast(`Échec : ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Réglages" side onClose={onClose}>
      <div>
        <div class="section-label">PASSKEYS</div>
        <div class="list">
          {keys?.map((k) => (
            <div class="li" key={k.id}>
              <span class="li-icon">
                <FingerprintPattern size={20} />
              </span>
              <span class="li-main">
                <span class="li-title">
                  {k.name} {k.current && <span class="chip primary">Cet appareil</span>}
                </span>
                <span class="li-sub">
                  Créée {relative(sqliteUtc(k.createdAt))}
                  {k.lastUsedAt && ` · utilisée ${relative(sqliteUtc(k.lastUsedAt))}`}
                </span>
              </span>
              {keys.length > 1 && (
                <button
                  class="icon-btn state"
                  disabled={busy}
                  onClick={() => confirm(`Supprimer la passkey « ${k.name} » ? Ses sessions seront fermées.`) && act(() => api.deletePasskey(k.id), "Passkey supprimée")}
                  aria-label={`Supprimer ${k.name}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <form
        class="fields"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => api.register(name || "Nouvel appareil"), "Passkey ajoutée").then(() => setName(""));
        }}
      >
        <label class="text-field">
          <input placeholder="Nom, ex. iPhone" value={name} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <button class="btn tonal" disabled={busy} type="submit">
          <Plus size={18} /> Ajouter une passkey
        </button>
        <span class="li-sub" style={{ whiteSpace: "normal" }}>
          Une passkey synchronisée (Google, iCloud, Bitwarden) fonctionne déjà sur tes autres appareils. Sinon, choisis « Utiliser un autre appareil » à la connexion pour passer par un QR code.
        </span>
      </form>
      <div class="fields">
        <div class="section-label">SESSIONS</div>
        <button class="btn outlined" disabled={busy} onClick={() => act(api.revokeOthers, "Autres appareils déconnectés")}>
          Déconnecter les autres appareils
        </button>
        <button class="btn outlined danger" disabled={busy} onClick={onLogout}>
          <LogOut size={18} /> Se déconnecter
        </button>
      </div>
    </Dialog>
  );
}
