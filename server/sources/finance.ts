import { z } from "zod";
import type { BudgetCategory, FinanceData, Txn } from "../../shared/types";
import { env } from "../env";
import { fetchJson } from "../http";

const cents = (decimal: string) => Math.round(Number(decimal) * 100);

const Budget = z.object({
  id: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  name: z.string(),
  current: z.boolean(),
});
const BudgetDetail = Budget.extend({
  budgeted_spending_cents: z.number(),
  expected_income_cents: z.number(),
  actual_spending_cents: z.number(),
  actual_income_cents: z.number(),
  available_to_spend_cents: z.number(),
});
const BudgetCategories = z.object({
  budget_categories: z.array(
    z.object({
      budgeted_spending_cents: z.number(),
      category: z.object({ id: z.string(), name: z.string(), color: z.string(), parent_id: z.string().nullable() }),
    }),
  ),
});
const SpendingVsNormal = z.object({
  categories: z.array(
    z.object({ id: z.string().nullable(), name: z.string(), color: z.string().nullable(), total: z.string(), normal: z.string() }),
  ),
});
const CashFlow = z.object({
  spending_comparison: z.object({
    delta: z.string(),
    current: z.array(z.object({ date: z.string(), amount: z.string() })),
    previous: z.array(z.object({ date: z.string(), amount: z.string() })),
  }),
});
const Transactions = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      name: z.string(),
      amount_cents: z.number(),
      classification: z.string(),
      kind: z.string(),
      excluded: z.boolean(),
      account: z.object({ name: z.string() }),
      category: z.object({ name: z.string(), color: z.string() }).nullable(),
      merchant: z.object({ name: z.string() }).nullable(),
    }),
  ),
});
const Accounts = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      balance_cents: z.number(),
      classification: z.string(),
      account_type: z.string(),
      status: z.string(),
    }),
  ),
});

export async function loadFinance(): Promise<FinanceData> {
  const key = env.sure.key;
  if (!key) throw new Error("SURE_API_KEY non configuré");
  const base = `${env.sure.url}/api/v1`;
  const init = { headers: { "X-Api-Key": key, accept: "application/json" } };

  const budgets = await fetchJson(`${base}/budgets?per_page=3`, z.object({ budgets: z.array(Budget) }), init);
  const current = budgets.budgets.find((b) => b.current) ?? budgets.budgets[0];
  if (!current) throw new Error("Aucun budget dans Sure");

  const [budget, categories, vsNormal, cashFlow, txns, accounts] = await Promise.all([
    fetchJson(`${base}/budgets/${current.id}`, BudgetDetail, init),
    fetchJson(`${base}/budget_categories?budget_id=${current.id}&per_page=100`, BudgetCategories, init),
    fetchJson(`${base}/spending_vs_normal`, SpendingVsNormal, init),
    fetchJson(`${base}/cash_flow`, CashFlow, init),
    fetchJson(`${base}/transactions?per_page=25`, Transactions, init),
    fetchJson(`${base}/accounts?per_page=100`, Accounts, init),
  ]);

  // Budgets live on top-level categories; spend comes pre-aggregated (subcategories rolled up).
  const spend = new Map(vsNormal.categories.map((c) => [c.id, c]));
  const merged: BudgetCategory[] = categories.budget_categories
    .filter((b) => b.category.parent_id === null)
    .map((b) => {
      const s = spend.get(b.category.id);
      return {
        id: b.category.id,
        name: b.category.name,
        color: b.category.color,
        budgeted: b.budgeted_spending_cents,
        spent: s ? cents(s.total) : 0,
        normal: s ? cents(s.normal) : 0,
      };
    })
    .filter((c) => c.budgeted > 0 || c.spent > 0)
    .sort((a, b) => b.spent - a.spent || b.budgeted - a.budgeted);

  const recent: Txn[] = txns.transactions
    .filter((t) => t.kind === "standard" && !t.excluded)
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      date: t.date,
      name: t.merchant?.name ?? t.name.replace(/\\.*$/, "").trim(),
      amount: t.amount_cents,
      classification: t.classification,
      category: t.category,
      account: t.account.name,
    }));

  const end = new Date(`${budget.end_date}T23:59:59`);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
  const sc = cashFlow.spending_comparison;

  return {
    month: { start: budget.start_date, end: budget.end_date, label: budget.name },
    spent: budget.actual_spending_cents,
    budgeted: budget.budgeted_spending_cents,
    available: budget.available_to_spend_cents,
    income: budget.actual_income_cents,
    expectedIncome: budget.expected_income_cents,
    daysLeft,
    categories: merged,
    curve: { current: sc.current.map((p) => cents(p.amount)), previous: sc.previous.map((p) => cents(p.amount)), delta: cents(sc.delta) },
    recent,
    accounts: accounts.accounts
      .filter((a) => a.status === "active")
      .map((a) => ({ id: a.id, name: a.name, balance: a.balance_cents, classification: a.classification, type: a.account_type }))
      .sort((a, b) => b.balance - a.balance),
    url: env.sure.url,
  };
}
