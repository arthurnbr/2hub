import { RefreshCw, Settings as SettingsIcon } from "lucide-preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { AuthState, Dashboard } from "../shared/types";
import { api, dashboardCache, Unauthorized } from "./api";
import { DeploysWidget } from "./components/DeploysWidget";
import { FinanceWidget } from "./components/FinanceWidget";
import { GiteaWidget } from "./components/GiteaWidget";
import { Launcher } from "./components/Launcher";
import { Login } from "./components/Login";
import { Settings } from "./components/Settings";
import { TasksWidget } from "./components/TasksWidget";
import { greeting, relative } from "./format";

const REFRESH_MS = 2 * 60_000;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function App() {
  // Render from cache immediately; auth state is only known after the first request.
  const [dash, setDash] = useState<Dashboard | null>(() => dashboardCache.read());
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [settings, setSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const now = useClock();

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const refresh = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const d = await api.dashboard(fresh);
      dashboardCache.write(d);
      setDash(d);
      setAuth({ authenticated: true, hasPasskeys: true });
      setOffline(false);
    } catch (e) {
      if (e instanceof Unauthorized) {
        setAuth(await api.state().catch(() => ({ authenticated: false, hasPasskeys: true })));
        setDash(null);
      } else {
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  if (auth && !auth.authenticated) {
    return <Login hasPasskeys={auth.hasPasskeys} onDone={() => refresh(true)} />;
  }

  const health = dash?.health.ok ? dash.health.data : null;

  return (
    <>
      <div class="aurora" />
      <div class="grain" />
      <main class="shell">
        <header class="top">
          <div class="greet">
            <div class="date">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
              <span class="clock">{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <h1>{greeting(now)}, Arthur</h1>
          </div>
          <div class="top-actions">
            <button class={`icon-btn${loading ? " spinning" : ""}`} onClick={() => refresh(true)} aria-label="Rafraîchir" title="Rafraîchir">
              <RefreshCw size={18} />
            </button>
            <button class="icon-btn" onClick={() => setSettings(true)} aria-label="Réglages" title="Réglages">
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        <Launcher health={health} />

        <div class="widgets">
          <TasksWidget section={dash?.tasks} onChange={() => refresh(true)} toast={toast} />
          <FinanceWidget section={dash?.finance} />
          <GiteaWidget section={dash?.gitea} />
          <DeploysWidget section={dash?.deploys} />
        </div>

        <footer class="foot">
          <span class={`live${offline ? " stale" : ""}`} />
          {dash ? `${offline ? "Hors ligne · " : ""}Mis à jour ${relative(dash.generatedAt)}` : "Chargement…"}
        </footer>
      </main>
      {settings && (
        <Settings
          onClose={() => setSettings(false)}
          toast={toast}
          onLogout={async () => {
            await api.logout();
            setSettings(false);
            setDash(null);
            setAuth({ authenticated: false, hasPasskeys: true });
          }}
        />
      )}
      {toastMsg && <div class="toast">{toastMsg}</div>}
    </>
  );
}
