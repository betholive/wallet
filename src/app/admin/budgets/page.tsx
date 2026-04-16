"use client";

import { useEffect, useState, useCallback } from "react";
import { Target, Save, Copy, Zap } from "lucide-react";
import { formatUGX, currentMonth, fmtPercent } from "@/lib/format";

interface Category { id: string; name: string; type: string; budget_bucket: string; color: string; }
interface BudgetRow { id: string; category_id: string; category_name: string; budget_bucket: string; budgeted_amount: number; spent: number; category_color: string; }

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [budgetRes, catRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch("/api/categories?type=expense"),
    ]);
    const bData = await budgetRes.json();
    const cats: Category[] = await catRes.json();
    setBudgets(bData.budgets || []);
    setMonthlyIncome(bData.monthly_income || 0);
    setCategories(cats);

    const d: Record<string, number> = {};
    for (const b of (bData.budgets || [])) {
      d[b.category_id] = Number(b.budgeted_amount);
    }
    for (const c of cats) {
      if (!(c.id in d)) d[c.id] = 0;
    }
    setDrafts(d);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const payload = Object.entries(drafts).map(([category_id, budgeted_amount]) => ({ category_id, budgeted_amount }));
    await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budgets: payload, month }) });
    await load();
    setSaving(false);
  };

  const quickSet503020 = () => {
    const inc = monthlyIncome;
    const needsCats = categories.filter(c => c.budget_bucket === "needs");
    const wantsCats = categories.filter(c => c.budget_bucket === "wants");
    const needsBudget = inc * 0.5;
    const wantsBudget = inc * 0.3;
    const d = { ...drafts };
    const perNeed = needsCats.length > 0 ? Math.round(needsBudget / needsCats.length) : 0;
    const perWant = wantsCats.length > 0 ? Math.round(wantsBudget / wantsCats.length) : 0;
    for (const c of needsCats) d[c.id] = perNeed;
    for (const c of wantsCats) d[c.id] = perWant;
    setDrafts(d);
  };

  const copyLastMonth = async () => {
    const prev = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]) - 2);
    const prevM = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/budgets?month=${prevM}`);
    const data = await res.json();
    const d: Record<string, number> = { ...drafts };
    for (const b of (data.budgets || [])) {
      d[b.category_id] = Number(b.budgeted_amount);
    }
    setDrafts(d);
  };

  // Calculate 50/30/20
  const spentMap = new Map<string, number>();
  for (const b of budgets) spentMap.set(b.category_id, Number(b.spent));

  const needsCats = categories.filter(c => c.budget_bucket === "needs");
  const wantsCats = categories.filter(c => c.budget_bucket === "wants");
  const needsSpent = needsCats.reduce((s, c) => s + (spentMap.get(c.id) || 0), 0);
  const wantsSpent = wantsCats.reduce((s, c) => s + (spentMap.get(c.id) || 0), 0);
  const needsBudgeted = needsCats.reduce((s, c) => s + (drafts[c.id] || 0), 0);
  const wantsBudgeted = wantsCats.reduce((s, c) => s + (drafts[c.id] || 0), 0);

  const inc = Math.max(monthlyIncome, 1);
  const needsPct = (needsSpent / inc) * 100;
  const wantsPct = (wantsSpent / inc) * 100;

  const allCatsGrouped = [
    { label: "Needs (target 50%)", bucket: "needs", cats: needsCats },
    { label: "Wants (target 30%)", bucket: "wants", cats: wantsCats },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500">Plan your spending, follow the 50/30/20 rule</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLastMonth} className="flex items-center gap-1 px-3 py-2 text-xs border border-gray-200 rounded-xl hover:bg-gray-50"><Copy className="w-3.5 h-3.5" /> Copy last</button>
          <button onClick={quickSet503020} className="flex items-center gap-1 px-3 py-2 text-xs border border-wallet-200 text-wallet-700 rounded-xl hover:bg-wallet-50"><Zap className="w-3.5 h-3.5" /> 50/30/20</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm" />
        <span className="text-sm text-gray-500">Income: <strong className="text-green-600">{formatUGX(monthlyIncome)}</strong></span>
      </div>

      {/* 50/30/20 Overlay */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-wallet-600" />
          <h2 className="text-sm font-semibold text-gray-700">50/30/20 Split</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "Needs", spent: needsSpent, budgeted: needsBudgeted, pct: needsPct, target: 50, color: "bg-blue-500" },
            { label: "Wants", spent: wantsSpent, budgeted: wantsBudgeted, pct: wantsPct, target: 30, color: "bg-purple-500" },
          ].map(b => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{b.label}: {fmtPercent(b.pct)} <span className="text-gray-400">(target {b.target}%)</span></span>
                <span className={b.pct > b.target ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                  {formatUGX(b.spent)} / {formatUGX(b.budgeted)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${b.pct > b.target ? "bg-red-500" : b.color}`} style={{ width: `${Math.min(b.pct / b.target * 100, 100)}%` }} />
              </div>
            </div>
          ))}
          <div className="text-xs text-gray-400">Savings+Debt (20%): Tracked via savings deposits + debt payments — not in expense budgets.</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Budget rows grouped by bucket */}
          {allCatsGrouped.map(group => (
            <div key={group.bucket} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {group.cats.map(cat => {
                  const spent = spentMap.get(cat.id) || 0;
                  const budgeted = drafts[cat.id] || 0;
                  const pct = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                  const over = spent > budgeted && budgeted > 0;
                  return (
                    <div key={cat.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                        </div>
                        <input
                          type="number"
                          value={drafts[cat.id] || ""}
                          onChange={e => setDrafts(d => ({ ...d, [cat.id]: Number(e.target.value) }))}
                          className="w-32 text-right px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Budget"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={over ? "text-red-600 font-medium" : "text-gray-500"}>
                          Spent: {formatUGX(spent)} {over && "⚠️ OVER"}
                        </span>
                        <span className="text-gray-400">
                          {budgeted > 0 ? `${formatUGX(Math.max(budgeted - spent, 0))} left` : "No budget set"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-wallet-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-wallet-600 hover:bg-wallet-700 disabled:bg-wallet-400 text-white font-medium rounded-xl transition flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Budgets"}
          </button>
        </>
      )}
    </div>
  );
}
