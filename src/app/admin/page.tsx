"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, ArrowUpRight, ArrowDownRight, Wallet, PiggyBank, 
  Landmark, CreditCard, UserCheck, TrendingUp, RefreshCw
} from "lucide-react";
import { formatUGX, fmtPercent, formatMonth } from "@/lib/format";

interface Account {
  id: string;
  name: string;
  type: 'savings' | 'debt' | 'asset' | 'receivable';
  balance: number;
  original?: number;
  paid?: number;
  progress?: number;
  color: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  category_name: string | null;
  date: string;
}

interface DashboardData {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  surplus: number;
  effective_month: string;
  
  // All accounts consolidated
  accounts: Account[];
  
  // Cash flow history
  cash_flow: { month: string; income: number; expenses: number }[];
  
  // Recent activity
  recent_transactions: Transaction[];
  
  // Health metrics
  health: {
    score: number;
    grade: 'excellent' | 'strong' | 'progressing' | 'struggling' | 'critical';
    dti_ratio: number;
    savings_rate: number;
  };
}

const TYPE_COLORS = {
  savings: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-600', border: 'border-emerald-100' },
  debt: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-600', border: 'border-red-100' },
  asset: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-600', border: 'border-blue-100' },
  receivable: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-600', border: 'border-amber-100' },
};

const TYPE_ICONS = {
  savings: PiggyBank,
  debt: CreditCard,
  asset: Landmark,
  receivable: UserCheck,
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${selectedMonth}&t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      console.log("Dashboard data received:", data);
      setData(data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const assets = (data.accounts || []).filter(a => a.type === 'savings' || a.type === 'asset' || a.type === 'receivable');
  const liabilities = (data.accounts || []).filter(a => a.type === 'debt');
  
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, d) => s + d.balance, 0);
  
  const gradeColors = {
    excellent: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    strong: { bg: 'bg-teal-100', text: 'text-teal-700', bar: 'bg-teal-500' },
    progressing: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
    struggling: { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
    critical: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  };
  const grade = data.health ? gradeColors[data.health.grade] : gradeColors.critical;

  return (
    <div className="space-y-4 pb-20">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-sm text-gray-500">{data.effective_month ? formatMonth(data.effective_month) : 'Current Month'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
          />
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* NET WORTH - Big Number */}
      <div className={`rounded-2xl p-5 ${grade.bg} border border-transparent`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${grade.text} uppercase tracking-wide`}>Net Worth</p>
            <p className={`text-4xl font-extrabold ${grade.text} mt-1`}>{formatUGX(data.net_worth)}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${grade.text} bg-white/50`}>
              <TrendingUp className="w-3 h-3" />
              {data.health.score}/100
            </div>
            <p className={`text-xs ${grade.text} mt-1`}>{data.health.grade}</p>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-white/60 rounded-xl p-3">
            <p className="text-xs text-gray-500">What You Own</p>
            <p className="text-lg font-bold text-emerald-600">{formatUGX(totalAssets)}</p>
            <p className="text-xs text-gray-400">{assets.length} accounts</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3">
            <p className="text-xs text-gray-500">What You Owe</p>
            <p className="text-lg font-bold text-red-600">{formatUGX(totalLiabilities)}</p>
            <p className="text-xs text-gray-400">{liabilities.length} debts</p>
          </div>
        </div>
      </div>

      {/* CASH FLOW - This Month */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Cash Flow</h2>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${data.surplus >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {data.surplus >= 0 ? '+' : ''}{formatUGX(data.surplus)} net
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <ArrowUpRight className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Income</p>
            <p className="text-xl font-bold text-emerald-600">{formatUGX(data.monthly_income)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <ArrowDownRight className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="text-xl font-bold text-red-600">{formatUGX(data.monthly_expenses)}</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Expense ratio</span>
            <span className={data.monthly_expenses > data.monthly_income * 0.8 ? 'text-red-600 font-medium' : 'text-gray-600'}>
              {data.monthly_income > 0 ? fmtPercent((data.monthly_expenses / data.monthly_income) * 100) : '0%'}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${data.monthly_expenses > data.monthly_income * 0.8 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: String(Math.min((data.monthly_expenses / Math.max(data.monthly_income, 1)) * 100, 100)) + '%' }} 
            />
          </div>
        </div>
      </div>

      {/* ALL ACCOUNTS - Consolidated View */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">All Accounts</h2>
          <button 
            onClick={() => router.push('/admin/savings')}
            className="text-xs text-wallet-600 hover:underline"
          >
            View all →
          </button>
        </div>
        
        <div className="space-y-2">
          {data.accounts.map(account => {
            const colors = TYPE_COLORS[account.type];
            const Icon = TYPE_ICONS[account.type];
            
            return (
              <div 
                key={account.id} 
                className={`flex items-center justify-between p-3 rounded-xl border ${colors.border} ${colors.bg} cursor-pointer hover:opacity-80 transition`}
                onClick={() => {
                  if (account.type === 'savings') router.push('/admin/savings');
                  else if (account.type === 'debt') router.push('/admin/debts');
                  else if (account.type === 'asset') router.push('/admin/assets');
                  else if (account.type === 'receivable') router.push('/admin/debts?tab=receivables');
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white`}>
                    <Icon className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.name}</p>
                    {account.progress !== undefined && account.progress > 0 && (
                      <p className="text-xs text-gray-500">{account.progress}% paid off</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${colors.text}`}>
                    {account.type === 'debt' ? '-' : '+'}{formatUGX(account.balance)}
                  </p>
                  {account.paid !== undefined && account.paid > 0 && (
                    <p className="text-xs text-gray-400">Paid: {formatUGX(account.paid)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {data.accounts.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No accounts yet</p>
            <button 
              onClick={() => router.push('/admin/savings')}
              className="mt-2 text-xs text-wallet-600 hover:underline"
            >
              Add your first account
            </button>
          </div>
        )}
      </div>

      {/* HEALTH METRICS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
          <p className="text-xs text-gray-500">Debt-to-Income</p>
          <p className={`text-lg font-bold ${data.health && data.health.dti_ratio > 36 ? 'text-red-600' : data.health && data.health.dti_ratio > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {data.health ? fmtPercent(data.health.dti_ratio) : '0%'}
          </p>
          <p className="text-xs text-gray-400">{data.health && data.health.dti_ratio > 36 ? 'High' : data.health && data.health.dti_ratio > 20 ? 'Moderate' : 'Good'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
          <p className="text-xs text-gray-500">Savings Rate</p>
          <p className={`text-lg font-bold ${data.health && data.health.savings_rate >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {data.health ? fmtPercent(data.health.savings_rate) : '0%'}
          </p>
          <p className="text-xs text-gray-400">{data.health && data.health.savings_rate >= 20 ? 'On track' : 'Low'}</p>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2>
          <button 
            onClick={() => router.push('/admin/transactions')}
            className="text-xs text-wallet-600 hover:underline"
          >
            View all →
          </button>
        </div>
        
        <div className="space-y-3">
          {data.recent_transactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {t.type === 'income' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.description || t.category_name || 'Transaction'}</p>
                  <p className="text-xs text-gray-400">{t.category_name}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {t.type === 'income' ? '+' : '-'}{formatUGX(t.amount)}
              </span>
            </div>
          ))}
        </div>
        
        {data.recent_transactions.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No transactions this month</p>
          </div>
        )}
      </div>

      {/* QUICK ADD BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => router.push('/admin/transactions')}
          className="flex items-center justify-center gap-2 p-3 bg-wallet-600 text-white rounded-xl font-medium hover:bg-wallet-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
        <button 
          onClick={() => router.push('/admin/savings')}
          className="flex items-center justify-center gap-2 p-3 bg-white border border-wallet-200 text-wallet-700 rounded-xl font-medium hover:bg-wallet-50 transition"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>
    </div>
  );
}
