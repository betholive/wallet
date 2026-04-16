"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, PiggyBank, CreditCard, Wallet, Target, RefreshCw } from "lucide-react";
import { formatUGX, fmtPercent, fmtShort } from "@/lib/format";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface DashboardData {
  health: {
    score: number; grade: string; color: string; advice: string[];
    savings_rate: number; dti_ratio: number; cash_flow_ratio: number;
    emergency_months: number; budget_adherence: number;
    net_worth_growing: boolean; debt_shrinking: boolean;
    financial_freedom_number: number; freedom_progress: number;
  };
  net_worth: number; prev_net_worth: number;
  monthly_income: number; monthly_expenses: number; surplus: number;
  effective_month?: string;
  total_debt_balance: number; total_debt_payments: number;
  total_savings: number; total_assets: number;
  fifty_thirty_twenty: {
    needs: { spent: number; pct: number; target: number };
    wants: { spent: number; pct: number; target: number };
    savings_debt: { spent: number; pct: number; target: number };
  };
  budget_pulse: { total: number; on_track: number };
  savings_goals: { name: string; goal_label: string | null; current: number; target: number; progress: number }[];
  debts: { id: string; name: string; current_balance: number; minimum_payment: number; status: string }[];
  cash_flow: { month: string; income: number; expenses: number }[];
  net_worth_history: { month: string; net_worth: number }[];
  recent_transactions: { id: string; type: string; amount: number; description: string | null; category_name: string | null; date: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Add cache-busting timestamp to prevent cached responses
    const res = await fetch(`/api/dashboard?t=${Date.now()}`, { cache: "no-store" });
    setData(await res.json());
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => { load(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading || !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" />
    </div>
  );

  const nwChange = data.net_worth - data.prev_net_worth;
  const topDebts = data.debts.filter(d => d.status === "active").slice(0, 3);

  const gradeBg: Record<string, string> = { critical: "bg-red-100", struggling: "bg-orange-100", progressing: "bg-amber-100", strong: "bg-teal-100", excellent: "bg-green-100" };
  const gradeText: Record<string, string> = { critical: "text-red-700", struggling: "text-orange-700", progressing: "text-amber-700", strong: "text-teal-700", excellent: "text-green-700" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {data.effective_month ? `Showing data for ${data.effective_month}` : "Your financial health at a glance"}
            {lastUpdated && <span className="ml-2 text-xs text-gray-400">• Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl transition" title="Refresh">
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Health Score */}
      <div className={`rounded-2xl p-4 ${gradeBg[data.health.grade]} border border-transparent`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-xs font-semibold ${gradeText[data.health.grade]} uppercase tracking-wide`}>Financial Health Score</p>
            <p className={`text-3xl font-extrabold ${gradeText[data.health.grade]}`}>{data.health.score}/100</p>
          </div>
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center`} style={{ borderColor: data.health.color, background: "white" }}>
            <span className="text-[10px] font-bold text-center leading-tight px-1" style={{ color: data.health.color }}>{data.health.grade.toUpperCase()}</span>
          </div>
        </div>
        <div className="space-y-1">
          {data.health.advice.slice(0, 2).map((a, i) => (
            <p key={i} className={`text-xs ${gradeText[data.health.grade]} opacity-90`}>• {a}</p>
          ))}
        </div>
      </div>

      {/* Net Worth */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Net Worth</p>
          <div className="flex items-center gap-1 text-xs">
            {nwChange >= 0 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
            <span className={nwChange >= 0 ? "text-green-600" : "text-red-600"}>{nwChange >= 0 ? "+" : ""}{formatUGX(Math.abs(nwChange))}</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-wallet-700">{formatUGX(data.net_worth)}</p>
        {data.net_worth_history.length > 1 && (
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={data.net_worth_history}>
              <defs><linearGradient id="nw" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0f766e" stopOpacity={0.3}/><stop offset="95%" stopColor="#0f766e" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="month" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: unknown) => formatUGX(Number(v))} contentStyle={{ fontSize: "11px", borderRadius: "10px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
              <Area type="monotone" dataKey="net_worth" stroke="#0f766e" fillOpacity={1} fill="url(#nw)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 50/30/20 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-wallet-600" /><p className="text-sm font-semibold text-gray-700">50/30/20 Split</p></div>
        <div className="space-y-3">
          {[
            { label: "Needs", key: "needs", color: "bg-blue-500", icon: Wallet },
            { label: "Wants", key: "wants", color: "bg-purple-500", icon: CreditCard },
            { label: "Savings+Debt", key: "savings_debt", color: "bg-green-500", icon: PiggyBank },
          ].map(item => {
            const v = data.fifty_thirty_twenty[item.key as keyof typeof data.fifty_thirty_twenty];
            const over = v.pct > v.target;
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 flex items-center gap-1"><item.icon className="w-3 h-3" /> {item.label}: {fmtPercent(v.pct)} <span className="text-gray-400">(target {v.target}%)</span></span>
                  <span className={over ? "text-red-600 font-medium" : "text-gray-700 font-medium"}>{formatUGX(v.spent)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${over ? "bg-red-500" : item.color}`} style={{ width: `${Math.min((v.pct / v.target) * 100, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cash Flow */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Cash Flow (last 6 months)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.cash_flow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: unknown) => fmtShort(Number(v))} />
            <Tooltip formatter={(v: unknown) => formatUGX(Number(v))} contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px" }} />
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"><p className="text-xs text-gray-500">Income</p><p className="text-sm font-bold text-green-600">{formatUGX(data.monthly_income)}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"><p className="text-xs text-gray-500">Expenses</p><p className="text-sm font-bold text-red-600">{formatUGX(data.monthly_expenses)}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"><p className="text-xs text-gray-500">DTI Ratio</p><p className={`text-sm font-bold ${data.health.dti_ratio > 36 ? "text-red-600" : data.health.dti_ratio > 20 ? "text-orange-600" : "text-green-600"}`}>{fmtPercent(data.health.dti_ratio)}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"><p className="text-xs text-gray-500">Savings Rate</p><p className={`text-sm font-bold ${data.health.savings_rate >= 20 ? "text-green-600" : "text-orange-600"}`}>{fmtPercent(data.health.savings_rate)}</p></div>
      </div>

      {/* Savings Goals */}
      {data.savings_goals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><PiggyBank className="w-4 h-4 text-wallet-600" /> Top Savings Goals</p>
          <div className="space-y-3">
            {data.savings_goals.map(g => (
              <div key={g.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{g.goal_label || g.name}</span>
                  <span className="text-gray-700 font-medium">{fmtPercent(g.progress)} • {formatUGX(g.current)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-wallet-500 rounded-full" style={{ width: `${g.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debts */}
      {topDebts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-red-500" /> Active Debts</p>
          <div className="space-y-2">
            {topDebts.map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{d.name}</span>
                <span className="text-red-600 font-medium">{formatUGX(Number(d.current_balance))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Freedom */}
      <div className="bg-gradient-to-br from-wallet-600 to-wallet-800 rounded-2xl p-4 text-white">
        <p className="text-xs font-medium opacity-80">Financial Freedom Progress</p>
        <p className="text-sm mt-1">You need <strong>{formatUGX(data.health.financial_freedom_number)}</strong> to live off 4% withdrawals</p>
        <div className="mt-3">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${data.health.freedom_progress}%` }} /></div>
          <p className="text-xs mt-1 opacity-80">{fmtPercent(data.health.freedom_progress)} of your freedom number • {formatUGX(data.total_savings + data.total_assets)} saved</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Recent Transactions</p>
        <div className="space-y-2">
          {data.recent_transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">{t.description || t.category_name || "—"}</p>
                <p className="text-xs text-gray-400">{t.category_name || "—"}</p>
              </div>
              <span className={t.type === "income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{t.type === "income" ? "+" : "-"}{formatUGX(Number(t.amount))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
