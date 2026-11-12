import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AuthState, Passkey } from "../shared/types";
import { db, type PasskeyRow } from "./db";
import { env } from "./env";

const SESSION_COOKIE = "hub_session";
const CHALLENGE_COOKIE = "hub_challenge";
const SESSION_TTL_MS = 400 * 24 * 3600 * 1000; // browsers cap cookie lifetime at 400 days
const SESSION_RENEW_MS = 30 * 24 * 3600 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
// Single-user hub: a fixed WebAuthn user handle keeps every passkey on the same account.
const USER_ID = new TextEncoder().encode("2hub-owner");

type Vars = { Variables: { passkeyId: string | null } };
type SessionRow = { id_hash: string; passkey_id: string | null; expires_at: number };

// SimpleWebAuthn verifies the credential payload itself; we only check the envelope.
const credentialJson = (v: unknown) =>
  typeof v === "object" && v !== null && "id" in v && typeof v.id === "string" && "response" in v;
const RegisterBody = z.object({
  response: z.custom<RegistrationResponseJSON>(credentialJson),
  name: z.string().optional(),
  token: z.string().optional(),
});
const RegisterOptionsBody = z.object({ token: z.string().optional() });
const LoginBody = z.custom<AuthenticationResponseJSON>(credentialJson);

const sha256 = (value: string) => new Bun.CryptoHasher("sha256").update(value).digest("hex");
const randomToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");

function cookieOpts(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "Strict" as const,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

const countPasskeys = db.query<{ n: number }, []>("SELECT count(*) AS n FROM passkeys");
const passkeyCount = () => countPasskeys.get()?.n ?? 0;

function readSession(c: Context) {
  const raw = getCookie(c, SESSION_COOKIE);
  if (!raw) return null;
  const row = db
    .query<SessionRow, [string]>("SELECT id_hash, passkey_id, expires_at FROM sessions WHERE id_hash = ?")
    .get(sha256(raw));
  if (!row || row.expires_at < Date.now()) return null;
  return { raw, ...row };
}

function startSession(c: Context, passkeyId: string) {
  const raw = randomToken();
  db.query("INSERT INTO sessions (id_hash, passkey_id, expires_at) VALUES (?, ?, ?)").run(
    sha256(raw),
    passkeyId,
    Date.now() + SESSION_TTL_MS,
  );
  setCookie(c, SESSION_COOKIE, raw, cookieOpts(SESSION_TTL_MS));
}

/** Stores a single-use challenge server-side and binds it to this browser with a cookie. */
function putChallenge(c: Context, challenge: string) {
  const id = randomToken();
  db.query("DELETE FROM challenges WHERE expires_at < ?").run(Date.now());
  db.query("INSERT INTO challenges (id, challenge, expires_at) VALUES (?, ?, ?)").run(id, challenge, Date.now() + CHALLENGE_TTL_MS);
  setCookie(c, CHALLENGE_COOKIE, id, cookieOpts(CHALLENGE_TTL_MS));
}

function takeChallenge(c: Context): string | null {
  const id = getCookie(c, CHALLENGE_COOKIE);
  deleteCookie(c, CHALLENGE_COOKIE, { path: "/" });
  if (!id) return null;
  const row = db
    .query<{ challenge: string; expires_at: number }, [string]>("DELETE FROM challenges WHERE id = ? RETURNING challenge, expires_at")
    .get(id);
  return row && row.expires_at >= Date.now() ? row.challenge : null;
}

/** Registration needs an open session (add a device) or the bootstrap token while no passkey exists. */
function mayRegister(c: Context<Vars>, token: string | undefined): boolean {
  if (c.get("passkeyId") !== null) return true;
  if (passkeyCount() > 0 || !token) return false;
  return timingSafeEqual(Buffer.from(sha256(token)), Buffer.from(sha256(env.bootstrapToken)));
}

const parseTransports = (t: string | null) => (t ? z.array(z.string()).parse(JSON.parse(t)) : undefined);

/** Resolves the session (sliding renewal) and exposes `passkeyId`; never rejects. */
export const session: MiddlewareHandler<Vars> = async (c, next) => {
  const s = readSession(c);
  c.set("passkeyId", s ? (s.passkey_id ?? "") : null);
  if (s && s.expires_at - Date.now() < SESSION_TTL_MS - SESSION_RENEW_MS) {
    db.query("UPDATE sessions SET expires_at = ? WHERE id_hash = ?").run(Date.now() + SESSION_TTL_MS, s.id_hash);
    setCookie(c, SESSION_COOKIE, s.raw, cookieOpts(SESSION_TTL_MS));
  }
  await next();
};

export const requireAuth: MiddlewareHandler<Vars> = async (c, next) => {
  if (c.get("passkeyId") === null) return c.json({ error: "unauthorized" }, 401);
  await next();
};

/** SameSite=Strict already blocks cross-site cookies; this rejects cross-origin writes outright. */
export const sameOrigin: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD" && c.req.header("origin") !== env.origin) {
    return c.json({ error: "bad origin" }, 403);
  }
  await next();
};

export const auth = new Hono<Vars>();

auth.get("/state", (c) => {
  const state: AuthState = { authenticated: c.get("passkeyId") !== null, hasPasskeys: passkeyCount() > 0 };
  return c.json(state);
});

auth.post("/register/options", async (c) => {
  const body = RegisterOptionsBody.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success || !mayRegister(c, body.data.token)) return c.json({ error: "forbidden" }, 403);
  const existing = db.query<Pick<PasskeyRow, "id" | "transports">, []>("SELECT id, transports FROM passkeys").all();
  const options = await generateRegistrationOptions({
    rpName: env.rpName,
    rpID: env.rpId,
    userName: "arthur",
    userDisplayName: "Arthur",
    userID: USER_ID,
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: parseTransports(p.transports) })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  putChallenge(c, options.challenge);
  return c.json(options);
});

auth.post("/register/verify", async (c) => {
  const body = RegisterBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "bad request" }, 400);
  const authed = c.get("passkeyId") !== null;
  if (!mayRegister(c, body.data.token)) return c.json({ error: "forbidden" }, 403);
  const challenge = takeChallenge(c);
  if (!challenge) return c.json({ error: "challenge expired" }, 400);
  const result = await verifyRegistrationResponse({
    response: body.data.response,
    expectedChallenge: challenge,
    expectedOrigin: env.origin,
    expectedRPID: env.rpId,
  }).catch((e: Error) => ({ verified: false as const, error: e.message }));
  if (!result.verified) return c.json({ error: "error" in result ? result.error : "not verified" }, 400);
  const { credential } = result.registrationInfo;
  const name = (body.data.name ?? "").trim().slice(0, 60) || `Passkey ${passkeyCount() + 1}`;
  db.query("INSERT INTO passkeys (id, public_key, counter, transports, name) VALUES (?, ?, ?, ?, ?)").run(
    credential.id,
    credential.publicKey,
    credential.counter,
    credential.transports ? JSON.stringify(credential.transports) : null,
    name,
  );
  if (!authed) startSession(c, credential.id);
  return c.json({ ok: true });
});

auth.post("/login/options", async (c) => {
  // Discoverable credentials: no allowCredentials, the authenticator picks the passkey.
  const options = await generateAuthenticationOptions({ rpID: env.rpId, userVerification: "preferred" });
  putChallenge(c, options.challenge);
  return c.json(options);
});

auth.post("/login/verify", async (c) => {
  const body = LoginBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "bad request" }, 400);
  const response = body.data;
  const challenge = takeChallenge(c);
  if (!challenge) return c.json({ error: "challenge expired" }, 400);
  const row = db.query<PasskeyRow, [string]>("SELECT * FROM passkeys WHERE id = ?").get(response.id);
  if (!row) return c.json({ error: "unknown passkey" }, 400);
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: env.origin,
    expectedRPID: env.rpId,
    credential: {
      id: row.id,
      publicKey: new Uint8Array(row.public_key),
      counter: row.counter,
      transports: parseTransports(row.transports),
    },
  }).catch((e: Error) => ({ verified: false as const, error: e.message }));
  if (!result.verified) return c.json({ error: "error" in result ? result.error : "not verified" }, 400);
  db.query("UPDATE passkeys SET counter = ?, last_used_at = datetime('now') WHERE id = ?").run(
    result.authenticationInfo.newCounter,
    row.id,
  );
  startSession(c, row.id);
  return c.json({ ok: true });
});

auth.post("/logout", (c) => {
  const s = readSession(c);
  if (s) db.query("DELETE FROM sessions WHERE id_hash = ?").run(s.id_hash);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

auth.get("/passkeys", requireAuth, (c) => {
  const rows = db
    .query<Omit<PasskeyRow, "public_key" | "counter" | "transports">, []>(
      "SELECT id, name, created_at, last_used_at FROM passkeys ORDER BY created_at",
    )
    .all();
  const current = c.get("passkeyId");
  const list: Passkey[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    current: r.id === current,
  }));
  return c.json(list);
});

auth.delete("/passkeys/:id", requireAuth, (c) => {
  if (passkeyCount() <= 1) return c.json({ error: "Impossible de supprimer la dernière passkey" }, 400);
  // ON DELETE CASCADE revokes every session opened with this passkey.
  db.query("DELETE FROM passkeys WHERE id = ?").run(c.req.param("id"));
  return c.json({ ok: true });
});

auth.post("/sessions/revoke-others", requireAuth, (c) => {
  const s = readSession(c);
  db.query("DELETE FROM sessions WHERE id_hash != ?").run(s?.id_hash ?? "");
  return c.json({ ok: true });
});
