"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, 
  AlertTriangle, RefreshCw, PieChart as PieChartIcon, BarChart3, Target, Zap
} from "lucide-react";
import { formatUGX, formatMonth } from "@/lib/format";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  category_name: string | null;
  date: string;
}

interface CategoryBreakdown {
  category_name: string;
  color: string;
  type: string;
  total: number;
}

interface BudgetCompliance {
  category_name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  compliance: number;
}

interface DashboardData {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  surplus: number;
  effective_month: string;
  period_label: string;
  budget_recommendations: {
    needs: { amount: number; percentage: number; description: string };
    wants: { amount: number; percentage: number; description: string };
    savings_debt: { amount: number; percentage: number; description: string };
  };
  cash_flow: { month: string; income: number; expenses: number }[];
  recent_transactions: Transaction[];
  health: {
    score: number;
    grade: 'excellent' | 'strong' | 'progressing' | 'struggling' | 'critical';
    dti_ratio: number;
    savings_rate: number;
  };
  category_breakdown: CategoryBreakdown[];
  budget_compliance: BudgetCompliance[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${selectedMonth}&period=${timePeriod}&t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, timePeriod]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const expenseToIncomeRatio = data.monthly_income > 0 ? (data.monthly_expenses / data.monthly_income) * 100 : 0;
  const savingsRate = data.health.savings_rate;
  const dtiRatio = data.health.dti_ratio;

  // Calculate highs/lows/averages
  const incomeCategories = data.category_breakdown.filter(c => c.type === 'income' && c.total > 0);
  const expenseCategories = data.category_breakdown.filter(c => c.type === 'expense' && c.total > 0);
  const highestExpense = expenseCategories.length > 0 ? expenseCategories[0] : null;
  const highestIncome = incomeCategories.length > 0 ? incomeCategories[0] : null;
  const avgTransaction = data.recent_transactions.length > 0 
    ? data.recent_transactions.reduce((sum, t) => sum + t.amount, 0) / data.recent_transactions.length 
    : 0;

  // Warnings
  const warnings = [];
  if (expenseToIncomeRatio > 90) warnings.push({ type: 'critical', message: 'Spending exceeds 90% of income' });
  if (expenseToIncomeRatio > 80) warnings.push({ type: 'warning', message: 'Spending exceeds 80% of income' });
  if (savingsRate < 10) warnings.push({ type: 'warning', message: 'Savings rate below 10%' });
  if (dtiRatio > 40) warnings.push({ type: 'critical', message: 'Debt-to-income ratio above 40%' });
  if (dtiRatio > 30) warnings.push({ type: 'warning', message: 'Debt-to-income ratio above 30%' });

  // Budget overspending
  const overspentCategories = data.budget_compliance.filter(b => b.compliance > 100);

  return (
    <div className="space-y-4 pb-20">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-500">{data.effective_month ? formatMonth(data.effective_month) : 'Current Month'} • {data.period_label}</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-wallet-500 focus:border-transparent transition"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-wallet-500 focus:border-transparent transition"
          />
          <button 
            onClick={load} 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KEY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded-lg bg-emerald-50"
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Total Income</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatUGX(data.monthly_income)}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded-lg bg-red-50"
            >
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatUGX(data.monthly_expenses)}</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded-lg bg-blue-50"
            >
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Savings Rate</p>
          </div>
          <p className={`text-xl font-bold ${savingsRate >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {savingsRate.toFixed(1)}%
          </p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="p-1.5 rounded-lg bg-purple-50"
            >
              <PieChartIcon className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Expense Ratio</p>
          </div>
          <p className={`text-xl font-bold ${expenseToIncomeRatio <= 70 ? 'text-emerald-600' : expenseToIncomeRatio <= 85 ? 'text-amber-600' : 'text-red-600'}`}>
            {expenseToIncomeRatio.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 50/30/20 BUDGET RECOMMENDATIONS */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-800">50/30/20 Budget Recommendations</h2>
        </div>
        <p className="text-xs text-gray-600 mb-4">Based on your monthly income of {formatUGX(data.monthly_income)}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-indigo-600">Needs (50%)</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Essential</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mb-1">{formatUGX(data.budget_recommendations.needs.amount)}</p>
            <p className="text-xs text-gray-500">{data.budget_recommendations.needs.description}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-600">Wants (30%)</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Discretionary</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mb-1">{formatUGX(data.budget_recommendations.wants.amount)}</p>
            <p className="text-xs text-gray-500">{data.budget_recommendations.wants.description}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-pink-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-pink-600">Savings+Debt (20%)</span>
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-medium">Priority</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mb-1">{formatUGX(data.budget_recommendations.savings_debt.amount)}</p>
            <p className="text-xs text-gray-500">{data.budget_recommendations.savings_debt.description}</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-indigo-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">💡 Tip:</span> Pay yourself first - transfer 20% to savings immediately when income hits. If needs exceed 50%, trim wants first.
          </p>
        </div>
      </div>

      {/* WARNINGS */}
      <div>
        {(warnings.length > 0 || overspentCategories.length > 0) && (
          <div
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <div 
                className="p-1.5 rounded-lg bg-amber-50"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              Alerts & Warnings
            </h2>
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div 
                  key={i}
                  className={`flex items-center gap-2 p-3 rounded-lg ${w.type === 'critical' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}
                >
                  <AlertTriangle className={`w-4 h-4 ${w.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
                  <p className="text-sm text-gray-700 font-medium">{w.message}</p>
                </div>
              ))}
              {overspentCategories.map((b, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-gray-700 font-medium">
                    Overspent {b.category_name}: {formatUGX(b.spent)} of {formatUGX(b.budgeted)} ({b.compliance.toFixed(0)}%)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CASH FLOW TREND CHART */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg bg-blue-50"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          Cash Flow Trend ({data.period_label})
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.cash_flow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value) => typeof value === 'number' ? formatUGX(value) : String(value)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NET INCOME TREND */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg bg-purple-50"
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          Net Income Trend
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.cash_flow.map(cf => ({ ...cf, net: cf.income - cf.expenses }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value) => typeof value === 'number' ? formatUGX(value) : String(value)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Net Income" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXPENSE EXTRAPOLATION */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg bg-amber-50"
          >
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          Expense Projection (Next 3 months)
        </h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              ...data.cash_flow.slice(-2).map(cf => ({ name: cf.month, actual: cf.expenses, projected: null })),
              { name: 'Next Month', actual: null, projected: data.monthly_expenses * 1.02 },
              { name: 'Month +2', actual: null, projected: data.monthly_expenses * 1.04 },
              { name: 'Month +3', actual: null, projected: data.monthly_expenses * 1.06 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value) => typeof value === 'number' ? formatUGX(value) : String(value)}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="actual" fill="#3b82f6" radius={4} name="Actual" />
              <Bar dataKey="projected" fill="#f59e0b" radius={4} name="Projected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">* Based on 2% monthly growth trend</p>
      </div>

      {/* CATEGORY BREAKDOWN */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Income Breakdown */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg bg-emerald-50"
            >
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
            </div>
            Income by Category
          </h2>
          <div className="h-48 w-full">
            {incomeCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => 'category_name' in entry ? (entry as {category_name: string}).category_name : ''}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {incomeCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => typeof value === 'number' ? formatUGX(value) : String(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No income this period</p>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg bg-red-50"
            >
              <PieChartIcon className="w-4 h-4 text-red-600" />
            </div>
            Expenses by Category
          </h2>
          <div className="h-48 w-full">
            {expenseCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => 'category_name' in entry ? (entry as {category_name: string}).category_name : ''}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => typeof value === 'number' ? formatUGX(value) : String(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No expenses this period</p>
            )}
          </div>
        </div>
      </div>

      {/* HIGHS/LOWS/AVERAGES */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg bg-purple-50"
          >
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          Insights: Highs, Lows & Averages
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div 
            className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-100"
          >
            <p className="text-xs text-gray-500 mb-1 font-medium">Highest Expense Category</p>
            <p className="text-sm font-bold text-gray-800">{highestExpense?.category_name || 'N/A'}</p>
            <p className="text-xs text-gray-500 mt-1">{formatUGX(highestExpense?.total || 0)}</p>
          </div>
          <div 
            className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100"
          >
            <p className="text-xs text-gray-500 mb-1 font-medium">Highest Income Category</p>
            <p className="text-sm font-bold text-gray-800">{highestIncome?.category_name || 'N/A'}</p>
            <p className="text-xs text-gray-500 mt-1">{formatUGX(highestIncome?.total || 0)}</p>
          </div>
          <div 
            className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-100"
          >
            <p className="text-xs text-gray-500 mb-1 font-medium">Average Transaction</p>
            <p className="text-sm font-bold text-gray-800">{formatUGX(avgTransaction)}</p>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2>
          <button
            onClick={() => router.push('/admin/transactions')}
            className="text-xs text-wallet-600 hover:underline font-medium"
          >
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {data.recent_transactions.slice(0, 5).map((tx) => (
            <div 
              key={tx.id}
              className="flex items-center justify-between py-3 px-3 rounded-lg border-b border-gray-100 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`p-1.5 rounded-lg ${tx.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}
                >
                  {tx.type === 'income' ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{tx.description || 'No description'}</p>
                  <p className="text-xs text-gray-500">{tx.category_name || 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatUGX(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div
        className="grid grid-cols-2 gap-4"
      >
        <button 
          onClick={() => router.push('/admin/transactions')}
          className="flex items-center justify-center gap-2 p-4 bg-wallet-600 text-white rounded-xl font-medium hover:bg-wallet-700 transition shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
        <button 
          onClick={() => router.push('/admin/accounts')}
          className="flex items-center justify-center gap-2 p-4 bg-white border border-wallet-200 text-wallet-700 rounded-xl font-medium hover:bg-wallet-50 transition shadow-md hover:shadow-lg"
        >
          <BarChart3 className="w-4 h-4" />
          View Accounts
        </button>
      </div>
    </div>
  );
}
