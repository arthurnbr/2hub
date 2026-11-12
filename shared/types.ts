// Wire contract between server/ and src/. Amounts are integer cents (EUR).

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export type Task = {
  id: number;
  title: string;
  /** ISO date or null when the task has no due date. */
  due: string | null;
  priority: number;
  project: { id: number; title: string; color: string | null };
  done: boolean;
  url: string;
};

export type TasksData = {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  /** Open tasks without a due date. */
  undatedCount: number;
  openCount: number;
};

export type BudgetCategory = {
  id: string;
  name: string;
  color: string;
  spent: number;
  budgeted: number;
  /** Average spend for this category over the baseline period. */
  normal: number;
};

export type Txn = {
  id: string;
  date: string;
  name: string;
  amount: number;
  /** "expense" | "income" */
  classification: string;
  category: { name: string; color: string } | null;
  account: string;
};

export type FinanceData = {
  month: { start: string; end: string; label: string };
  spent: number;
  budgeted: number;
  available: number;
  income: number;
  expectedIncome: number;
  daysLeft: number;
  categories: BudgetCategory[];
  /** Cumulative outflows per day (cents), current month vs previous month. */
  curve: { current: number[]; previous: number[]; delta: number };
  recent: Txn[];
  accounts: { id: string; name: string; balance: number; classification: string; type: string }[];
  url: string;
};

export type GiteaNotification = {
  id: number;
  title: string;
  type: string;
  state: string;
  repo: string;
  url: string;
  updatedAt: string;
};

export type GiteaPull = { id: number; title: string; repo: string; url: string; number: number; updatedAt: string };

export type GiteaData = {
  unread: number;
  notifications: GiteaNotification[];
  reviewRequested: GiteaPull[];
  mine: GiteaPull[];
  url: string;
};

export type Deployment = { name: string; status: string; url: string | null; kind: "app" | "service" };

export type DeployInstance = {
  id: string;
  label: string;
  url: string;
  healthy: number;
  total: number;
  problems: Deployment[];
};

export type DeploysData = { instances: DeployInstance[] };

export type HealthData = Record<string, { up: boolean; ms: number | null }>;

export type Dashboard = {
  generatedAt: string;
  tasks: Section<TasksData>;
  finance: Section<FinanceData>;
  gitea: Section<GiteaData>;
  deploys: Section<DeploysData>;
  health: Section<HealthData>;
};

export type AuthState = { authenticated: boolean; hasPasskeys: boolean };

export type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null; current: boolean };

/** User preferences stored server-side so every browser shows the same shortcuts. */
export type Prefs = { pinned: string[] };
