import { Grip, RefreshCw, Settings as SettingsIcon } from "lucide-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { DEFAULT_PINNED } from "../shared/apps";
import type { AuthState, Dashboard, Prefs } from "../shared/types";
import { api, dashboardCache, prefsCache, Unauthorized } from "./api";
import { AppDrawer } from "./components/AppDrawer";
import { DeploysDetail, DeploysTile } from "./components/Deploys";
import { FinanceDetail, FinanceTile } from "./components/Finance";
import { GiteaDetail, GiteaTile } from "./components/Gitea";
import { Login } from "./components/Login";
import { Search } from "./components/Search";
import { Settings } from "./components/Settings";
import { Shortcuts } from "./components/Shortcuts";
import { TasksDetail, TasksTile } from "./components/Tasks";
import { greeting, relative } from "./format";

const REFRESH_MS = 2 * 60_000;
const PRIVACY_KEY = "2hub:privacy";

type Detail = "tasks" | "finance" | "gitea" | "deploys" | null;
type Drawer = "closed" | "browse" | "pick";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(id);
  }, [msg]);
  return [msg, setMsg] as const;
}

export function App() {
  // First paint comes from local caches; the network only refreshes.
  const [dash, setDash] = useState<Dashboard | null>(() => dashboardCache.read());
  const [pinned, setPinned] = useState<string[]>(() => prefsCache.read()?.pinned ?? DEFAULT_PINNED);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [detail, setDetail] = useState<Detail>(null);
  const [drawer, setDrawer] = useState<Drawer>("closed");
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem(PRIVACY_KEY) === "1");
  const [toastMsg, toast] = useToast();
  const now = useClock();

  const refresh = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([api.dashboard(fresh), api.prefs()]);
      dashboardCache.write(d);
      prefsCache.write(p);
      setDash(d);
      setPinned(p.pinned);
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

  const savePinned = async (next: string[]) => {
    const prev = pinned;
    setPinned(next);
    prefsCache.write({ pinned: next });
    try {
      const saved: Prefs = await api.savePrefs({ pinned: next });
      setPinned(saved.pinned);
    } catch (e) {
      setPinned(prev);
      toast(`Échec de l'enregistrement : ${e instanceof Error ? e.message : e}`);
    }
  };

  const togglePrivacy = () => {
    localStorage.setItem(PRIVACY_KEY, hidden ? "0" : "1");
    setHidden(!hidden);
  };

  const closeDrawer = useCallback(() => setDrawer("closed"), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  if (auth && !auth.authenticated) {
    return <Login hasPasskeys={auth.hasPasskeys} onDone={() => refresh(true)} />;
  }

  const health = dash?.health.ok ? dash.health.data : null;
  const onTaskChange = () => refresh(true);

  return (
    <>
      <main class="shell">
        <header class="topbar">
          <div class="hello">
            <div class="hello-date">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
              <span class="num">{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <h1 class="hello-title">{greeting(now)}, Arthur</h1>
          </div>
          <Search />
          <div class="top-actions">
            <button class={`icon-btn state${loading ? " spinning" : ""}`} onClick={() => refresh(true)} aria-label="Actualiser" title="Actualiser">
              <RefreshCw size={20} />
            </button>
            <button class="icon-btn state" onClick={() => setSettings(true)} aria-label="Réglages" title="Réglages">
              <SettingsIcon size={20} />
            </button>
            <button
              class="icon-btn state"
              aria-pressed={drawer !== "closed"}
              onClick={() => setDrawer(drawer === "closed" ? "browse" : "closed")}
              aria-label="Toutes les apps"
              title="Toutes les apps"
            >
              <Grip size={20} />
            </button>
          </div>
        </header>

        <Shortcuts
          pinned={pinned}
          health={health}
          editing={editing}
          onReorder={savePinned}
          onAdd={() => setDrawer("pick")}
          onDoneEditing={() => setEditing(false)}
        />

        <div class="tiles">
          <TasksTile section={dash?.tasks} onOpen={() => setDetail("tasks")} onChange={onTaskChange} toast={toast} />
          <FinanceTile section={dash?.finance} onOpen={() => setDetail("finance")} hidden={hidden} onTogglePrivacy={togglePrivacy} />
          <GiteaTile section={dash?.gitea} onOpen={() => setDetail("gitea")} />
          <DeploysTile section={dash?.deploys} health={health} onOpen={() => setDetail("deploys")} />
        </div>

        <footer class="foot">
          <span class="status">
            <span class={`live${offline ? " stale" : ""}`} />
            {dash ? `${offline ? "Hors ligne · " : ""}Mis à jour ${relative(dash.generatedAt)}` : "Chargement…"}
          </span>
          <span>Tape n'importe où pour chercher</span>
        </footer>
      </main>

      {drawer !== "closed" && (
        <AppDrawer
          pinned={pinned}
          health={health}
          picking={drawer === "pick"}
          onTogglePin={(id) => savePinned(pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id])}
          onEditShortcuts={() => {
            setDrawer("closed");
            setEditing(true);
          }}
          onClose={closeDrawer}
        />
      )}

      {detail === "tasks" && dash?.tasks.ok && <TasksDetail data={dash.tasks.data} onClose={closeDetail} onChange={onTaskChange} toast={toast} />}
      {detail === "finance" && dash?.finance.ok && (
        <FinanceDetail data={dash.finance.data} onClose={closeDetail} hidden={hidden} onTogglePrivacy={togglePrivacy} />
      )}
      {detail === "gitea" && dash?.gitea.ok && <GiteaDetail data={dash.gitea.data} onClose={closeDetail} />}
      {detail === "deploys" && dash?.deploys.ok && <DeploysDetail data={dash.deploys.data} health={health} onClose={closeDetail} />}

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
      {toastMsg && (
        <div class="snackbar" role="status">
          {toastMsg}
        </div>
      )}
    </>
  );
}
