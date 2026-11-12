import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { AuthState, Dashboard, Passkey, Prefs } from "../shared/types";

const CACHE_KEY = "2hub:dashboard";
const PREFS_KEY = "2hub:prefs";

export class Unauthorized extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: init.body ? { "content-type": "application/json" } : undefined,
  });
  if (res.status === 401) throw new Unauthorized();
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${res.status}`;
    throw new Error(message);
  }
  // Same-origin server owns the contract in shared/types.ts.
  const typed = body as T;
  return typed;
}

const post = <T>(path: string, body?: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  state: () => call<AuthState>("/auth/state"),
  dashboard: (fresh = false) => call<Dashboard>(`/dashboard${fresh ? "?fresh=1" : ""}`),
  setDone: (id: number, done: boolean) => post(`/tasks/${id}/done`, { done }),
  createTask: (title: string) => post("/tasks", { title, today: true }),
  prefs: () => call<Prefs>("/prefs"),
  savePrefs: (prefs: Prefs) => call<Prefs>("/prefs", { method: "PUT", body: JSON.stringify(prefs) }),
  passkeys: () => call<Passkey[]>("/auth/passkeys"),
  deletePasskey: (id: string) => call(`/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" }),
  revokeOthers: () => post("/auth/sessions/revoke-others"),
  logout: async () => {
    await post("/auth/logout");
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(PREFS_KEY);
  },

  async login() {
    const optionsJSON = await post<PublicKeyCredentialRequestOptionsJSON>("/auth/login/options");
    await post("/auth/login/verify", await startAuthentication({ optionsJSON }));
  },

  /** `token` only for the first passkey (bootstrap); later devices register from an open session. */
  async register(name: string, token?: string) {
    const optionsJSON = await post<PublicKeyCredentialCreationOptionsJSON>("/auth/register/options", { token });
    const response = await startRegistration({ optionsJSON });
    await post("/auth/register/verify", { response, name, token });
  },
};

export const dashboardCache = {
  read(): Dashboard | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      // Our own blob, written by `write` below from a server-typed Dashboard; a stale shape only
      // affects the first paint and is replaced by the network refresh.
      const cachedDashboard = JSON.parse(raw) as Dashboard;
      return cachedDashboard;
    } catch {
      return null;
    }
  },
  write(d: Dashboard) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(d));
  },
};

export const prefsCache = {
  read(): Prefs | null {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      // Own blob written by `write` from a server-typed Prefs.
      const cachedPrefs = JSON.parse(raw) as Prefs;
      return cachedPrefs;
    } catch {
      return null;
    }
  },
  write(p: Prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  },
};
