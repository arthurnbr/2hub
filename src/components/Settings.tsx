import { FingerprintPattern, LogOut, Plus, Trash2, X } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Passkey } from "../../shared/types";
import { api } from "../api";
import { relative } from "../format";

type Props = { onClose: () => void; onLogout: () => void; toast: (m: string) => void };

export function Settings({ onClose, onLogout, toast }: Props) {
  const [keys, setKeys] = useState<Passkey[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => api.passkeys().then(setKeys, (e: Error) => toast(e.message));
  useEffect(() => {
    reload();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      await reload();
    } catch (e) {
      toast(`Erreur : ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div class="scrim" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Réglages">
        <div class="card-head">
          <h2>Réglages</h2>
          <button class="icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <section class="sheet-section">
          <h3 class="sub-title" style={{ margin: 0 }}>Passkeys</h3>
          {keys?.map((k) => (
            <div class="passkey" key={k.id}>
              <span class="row-icon"><FingerprintPattern size={16} /></span>
              <span class="row-main">
                <span class="row-title">
                  {k.name} {k.current && <span class="pill accent">cet appareil</span>}
                </span>
                <span class="row-meta">
                  Créée {relative(k.createdAt.replace(" ", "T") + "Z")}
                  {k.lastUsedAt && ` · utilisée ${relative(k.lastUsedAt.replace(" ", "T") + "Z")}`}
                </span>
              </span>
              {keys.length > 1 && (
                <button
                  class="icon-btn btn-danger"
                  style={{ width: 36, height: 36 }}
                  disabled={busy}
                  onClick={() => confirm(`Supprimer « ${k.name} » ?`) && act(() => api.deletePasskey(k.id), "Passkey supprimée")}
                  aria-label="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(() => api.register(name || "Nouvel appareil"), "Passkey ajoutée").then(() => setName(""));
            }}
          >
            <input class="field" placeholder="Nom (ex. iPhone, MacBook…)" value={name} onInput={(e) => setName(e.currentTarget.value)} />
            <button class="btn btn-ghost" disabled={busy} type="submit">
              <Plus size={15} /> Ajouter une passkey
            </button>
          </form>
          <p class="row-meta" style={{ margin: 0, whiteSpace: "normal" }}>
            Les passkeys synchronisées (Google, iCloud, Bitwarden) marchent directement sur tes autres appareils. Pour un appareil
            sans synchro, ouvre le hub dessus et utilise « autre appareil » (QR code) au moment de te connecter.
          </p>
        </section>

        <section class="sheet-section">
          <h3 class="sub-title" style={{ margin: 0 }}>Sessions</h3>
          <button class="btn btn-ghost" disabled={busy} onClick={() => act(api.revokeOthers, "Autres sessions déconnectées")}>
            Déconnecter les autres appareils
          </button>
          <button class="btn btn-ghost btn-danger" disabled={busy} onClick={onLogout}>
            <LogOut size={15} /> Se déconnecter
          </button>
        </section>
      </div>
    </>
  );
}
