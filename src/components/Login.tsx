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
      setError(/NotAllowed|abort|timed out/i.test(msg) ? "Annulé." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="login">
      <div class="aurora" />
      <div class="grain" />
      <div class="login-card">
        <div class="logo">
          <LayoutGrid size={30} />
        </div>
        <h1>2hub</h1>
        {hasPasskeys ? (
          <>
            <p>Déverrouille ton hub avec ta passkey.</p>
            <button class="btn btn-primary" disabled={busy} onClick={() => run(api.login)} autoFocus>
              <FingerprintPattern size={20} />
              {busy ? "En attente…" : "Se connecter"}
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => api.register(name || "Premier appareil", token));
            }}
          >
            <p>Première configuration : crée la passkey de cet appareil.</p>
            <input class="field" type="password" placeholder="Jeton de setup (BOOTSTRAP_TOKEN)" value={token} onInput={(e) => setToken(e.currentTarget.value)} required />
            <input class="field" placeholder="Nom de l'appareil (ex. PC fixe)" value={name} onInput={(e) => setName(e.currentTarget.value)} />
            <button class="btn btn-primary" disabled={busy} type="submit">
              <FingerprintPattern size={20} />
              {busy ? "En attente…" : "Créer ma passkey"}
            </button>
          </form>
        )}
        {error && <div class="login-error">{error}</div>}
      </div>
    </main>
  );
}
