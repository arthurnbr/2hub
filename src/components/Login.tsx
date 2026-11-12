import { FingerprintPattern, LayoutGrid } from "lucide-preact";
import { useState } from "preact/hooks";
import { api } from "../api";

/** First visit (no passkey yet) shows setup with the bootstrap token; afterwards a one-tap passkey login. */
export function Login({ hasPasskeys, onDone }: { hasPasskeys: boolean; onDone: () => void }) {
  const [token, setToken] = useState(() => new URLSearchParams(location.search).get("setup") ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      history.replaceState(null, "", "/");
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/NotAllowed|abort|timed out/i.test(msg) ? "Connexion annulée. Réessaie quand tu es prêt." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="login">
      <div class="login-card">
        <span class="login-mark">
          <LayoutGrid size={24} />
        </span>
        <h1>{hasPasskeys ? "Connexion à 2hub" : "Configurer 2hub"}</h1>
        {hasPasskeys ? (
          <>
            <p>Utilise la passkey de cet appareil.</p>
            <button class="btn filled block" disabled={busy} onClick={() => run(api.login)} autoFocus>
              <FingerprintPattern size={18} />
              {busy ? "En attente de la passkey…" : "Se connecter"}
            </button>
          </>
        ) : (
          <form
            class="fields"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => api.register(name || "Premier appareil", token));
            }}
          >
            <p>Crée la passkey de cet appareil. Le jeton de configuration se trouve dans ~/.secrets/hub.env.</p>
            <label class="text-field">
              <input type="password" placeholder="Jeton de configuration" value={token} onInput={(e) => setToken(e.currentTarget.value)} required />
            </label>
            <label class="text-field">
              <input placeholder="Nom de l'appareil, ex. PC fixe" value={name} onInput={(e) => setName(e.currentTarget.value)} />
            </label>
            <button class="btn filled block" disabled={busy} type="submit">
              <FingerprintPattern size={18} />
              {busy ? "En attente de la passkey…" : "Créer la passkey"}
            </button>
          </form>
        )}
        {error && <div class="login-error">{error}</div>}
      </div>
    </main>
  );
}
