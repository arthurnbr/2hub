function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
const opt = (name: string) => process.env[name] || null;
const trim = (u: string) => u.replace(/\/+$/, "");

const origin = trim(process.env.ORIGIN ?? "http://localhost:5173");

export const env = {
  port: Number(process.env.PORT ?? 3000),
  origin,
  rpId: process.env.RP_ID ?? new URL(origin).hostname,
  rpName: "2hub",
  dataDir: process.env.DATA_DIR ?? "./data",
  /** Allows registering the first passkey while none exists. */
  bootstrapToken: req("BOOTSTRAP_TOKEN"),
  timeZone: process.env.HUB_TIMEZONE || "Europe/Paris",
  secureCookies: origin.startsWith("https://"),
  vikunja: { url: trim(process.env.VIKUNJA_URL ?? "https://todo.nobrega.fr"), token: opt("VIKUNJA_TOKEN"), inbox: Number(process.env.VIKUNJA_INBOX_PROJECT ?? 1) },
  sure: { url: trim(process.env.SURE_URL ?? "https://finance.nobrega.fr"), key: opt("SURE_API_KEY") },
  gitea: { url: trim(process.env.GITEA_URL ?? "https://git.eduvia.dev"), token: opt("GITEA_TOKEN") },
  coolify: [
    { id: "nobrega", label: "2serv", url: trim(process.env.COOLIFY_URL ?? "https://cool.nobrega.fr"), token: opt("COOLIFY_TOKEN") },
    { id: "eduvia", label: "Eduvia", url: trim(process.env.COOLIFY_EDUVIA_URL ?? "https://coolify.eduvia.dev"), token: opt("COOLIFY_EDUVIA_TOKEN") },
  ],
};
