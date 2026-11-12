// Launcher catalog, shared by the client (rendered from the precache, no network)
// and the server (health pings). `icon` is a lucide icon name mapped in src/icons.ts.

export type App = {
  id: string;
  name: string;
  url: string;
  icon: string;
  hue: number;
  hint?: string;
  /** Extra search words for the quick launcher. */
  keywords?: string;
};

export type AppGroup = { id: string; title: string; apps: App[] };

export const APP_GROUPS: AppGroup[] = [
  {
    id: "perso",
    title: "Perso",
    apps: [
      { id: "todo", name: "Vikunja", url: "https://todo.nobrega.fr", icon: "list-checks", hue: 262, hint: "Tâches", keywords: "todo taches" },
      { id: "finance", name: "Finance", url: "https://finance.nobrega.fr", icon: "wallet", hue: 152, hint: "Sure · budget", keywords: "sure maybe banque budget depenses" },
      { id: "drive", name: "Drive", url: "https://drive.nobrega.fr", icon: "hard-drive", hue: 28, hint: "Seafile", keywords: "seafile fichiers" },
      { id: "mail", name: "Mail", url: "https://mail.nobrega.fr/webmail/", icon: "mail", hue: 205, hint: "Mailu", keywords: "mailu webmail" },
      { id: "password", name: "Vaultwarden", url: "https://password.nobrega.fr", icon: "key-round", hue: 214, hint: "Mots de passe", keywords: "bitwarden password" },
      { id: "cals", name: "Calories", url: "https://cals.nobrega.fr", icon: "apple", hue: 8, hint: "SparkyFitness", keywords: "sparky fitness nutrition" },
      { id: "mem", name: "Mem Trainer", url: "https://mem.nobrega.fr", icon: "brain", hue: 318, hint: "Mémoire", keywords: "memoire" },
    ],
  },
  {
    id: "nscapital",
    title: "NS. Capital",
    apps: [
      { id: "erp", name: "Dolibarr", url: "https://erp.nobrega.fr", icon: "receipt-text", hue: 190, hint: "Factures · devis", keywords: "erp facture devis" },
      { id: "foodmart", name: "FoodMart BI", url: "https://foodmart.nobrega.fr", icon: "chart-column", hue: 45, hint: "BI", keywords: "bi dashboard" },
    ],
  },
  {
    id: "eduvia",
    title: "Eduvia",
    apps: [
      { id: "eduvia-hub", name: "Hub Eduvia", url: "https://hub.eduvia.app", icon: "graduation-cap", hue: 236, hint: "Production", keywords: "eduvia app prod" },
      { id: "gitea", name: "Gitea", url: "https://git.eduvia.dev", icon: "git-branch", hue: 100, hint: "git.eduvia.dev", keywords: "git code repo pr" },
      { id: "plane", name: "Plane", url: "https://plane.eduvia.dev", icon: "kanban", hue: 220, hint: "Projets", keywords: "tickets issues" },
      { id: "sentry", name: "Sentry", url: "https://bug.eduvia.dev", icon: "bug", hue: 290, hint: "Erreurs", keywords: "bug glitchtip erreurs" },
      { id: "coolify-eduvia", name: "Coolify Eduvia", url: "https://coolify.eduvia.dev", icon: "server", hue: 270, hint: "Déploiements", keywords: "deploy" },
      { id: "eduvia-site", name: "eduvia.app", url: "https://eduvia.app", icon: "globe", hue: 230, hint: "Landing", keywords: "site landing" },
    ],
  },
  {
    id: "infra",
    title: "Infra",
    apps: [
      { id: "coolify", name: "Coolify", url: "https://cool.nobrega.fr", icon: "server-cog", hue: 275, hint: "2serv", keywords: "deploy" },
      { id: "uptime", name: "Uptime Kuma", url: "https://up.nobrega.fr", icon: "activity", hue: 140, hint: "Uptime", keywords: "kuma status" },
      { id: "beszel", name: "Beszel", url: "https://monitor.nobrega.fr", icon: "gauge", hue: 175, hint: "Monitoring", keywords: "monitor cpu" },
      { id: "github", name: "GitHub", url: "https://github.com/arthurnbr", icon: "code-xml", hue: 0, hint: "arthurnbr", keywords: "git" },
    ],
  },
];

export const ALL_APPS: App[] = APP_GROUPS.flatMap((g) => g.apps);

/** Shortcut row shown until the user customises it. */
export const DEFAULT_PINNED = ["todo", "finance", "gitea", "eduvia-hub", "mail", "drive", "erp", "coolify"];
