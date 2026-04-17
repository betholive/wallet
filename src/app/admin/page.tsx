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
  goal_label?: string | null;
  target_amount?: number | null;
  savings_type?: string;
  creditor?: string | null;
  minimum_payment?: number;
  category?: string;
  person?: string | null;
}

interface SavingsGoal {
  id: string;
  name: string;
  goal_label: string | null;
  current_balance: number;
  target_amount: number;
  progress: number;
  remaining: number;
  type: string;
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
  
  // Book-keeping summaries
  savings_goals: SavingsGoal[];
  total_savings: number;
  emergency_fund: number;
  payable_debts: number;
  receivable_amount: number;
  net_debt_position: number;
  total_assets: number;
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
  const savingsAccounts = (data.accounts || []).filter(a => a.type === 'savings');
  const debtAccounts = (data.accounts || []).filter(a => a.type === 'debt');
  const receivableAccounts = (data.accounts || []).filter(a => a.type === 'receivable');
  const assetAccounts = (data.accounts || []).filter(a => a.type === 'asset');
  
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
          <h1 className="text-xl font-bold text-gray-900">Financial Dashboard</h1>
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

      {/* INCOME STATEMENT */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Income Statement
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Total Income</span>
            <span className="text-sm font-bold text-emerald-600">{formatUGX(data.monthly_income)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Total Expenses</span>
            <span className="text-sm font-bold text-red-600">{formatUGX(data.monthly_expenses)}</span>
          </div>
          <div className={`flex justify-between items-center py-2 ${data.surplus >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg px-3`}>
            <span className="text-sm font-semibold text-gray-700">Net Income</span>
            <span className={`text-sm font-bold ${data.surplus >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.surplus >= 0 ? '+' : ''}{formatUGX(data.surplus)}
            </span>
          </div>
        </div>
      </div>

      {/* BALANCE SHEET */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600" />
          Balance Sheet
        </h2>
        <div className="space-y-4">
          {/* Assets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assets</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">Cash & Savings</span>
                <span className="text-sm font-medium text-gray-800">{formatUGX(data.total_savings)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">Receivables (owed to you)</span>
                <span className="text-sm font-medium text-gray-800">{formatUGX(data.receivable_amount)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">Other Assets</span>
                <span className="text-sm font-medium text-gray-800">{formatUGX(data.total_assets)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
                <span className="text-sm text-gray-700">Total Assets</span>
                <span className="text-sm font-bold text-emerald-600">{formatUGX(totalAssets)}</span>
              </div>
            </div>
          </div>
          
          {/* Liabilities */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Liabilities</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">Payable Debts (you owe)</span>
                <span className="text-sm font-medium text-gray-800">{formatUGX(data.payable_debts)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-semibold">
                <span className="text-sm text-gray-700">Total Liabilities</span>
                <span className="text-sm font-bold text-red-600">{formatUGX(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Net Worth */}
          <div className={`flex justify-between items-center py-3 px-3 rounded-xl ${grade.bg}`}>
            <span className="text-sm font-bold text-gray-700">Net Worth (Equity)</span>
            <span className={`text-lg font-bold ${grade.text}`}>{formatUGX(data.net_worth)}</span>
          </div>
        </div>
      </div>

      {/* SAVINGS GOALS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-purple-600" />
            Savings Goals
          </h2>
          <button 
            onClick={() => router.push('/admin/savings')}
            className="text-xs text-wallet-600 hover:underline"
          >
            Manage →
          </button>
        </div>
        
        {data.savings_goals && data.savings_goals.length > 0 ? (
          <div className="space-y-3">
            {data.savings_goals.map(goal => (
              <div key={goal.id} className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{goal.goal_label || goal.name}</p>
                    <p className="text-xs text-gray-500">{formatUGX(goal.current_balance)} of {formatUGX(goal.target_amount)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${goal.progress >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                    {goal.progress.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{ width: String(Math.min(goal.progress, 100)) + '%' }}
                  />
                </div>
                {goal.remaining > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{formatUGX(goal.remaining)} remaining</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No savings goals set</p>
            <button 
              onClick={() => router.push('/admin/savings')}
              className="mt-2 text-xs text-wallet-600 hover:underline"
            >
              Create a goal
            </button>
          </div>
        )}
      </div>

      {/* DEBT POSITION */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-red-600" />
            Debt Position
          </h2>
          <button 
            onClick={() => router.push('/admin/debts')}
            className="text-xs text-wallet-600 hover:underline"
          >
            Manage →
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 rounded-xl">
            <p className="text-xs text-gray-500">You Owe (Payable)</p>
            <p className="text-lg font-bold text-red-600">{formatUGX(data.payable_debts)}</p>
            <p className="text-xs text-gray-400">{debtAccounts.length} debts</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-gray-500">Owed to You (Receivable)</p>
            <p className="text-lg font-bold text-amber-600">{formatUGX(data.receivable_amount)}</p>
            <p className="text-xs text-gray-400">{receivableAccounts.length} receivables</p>
          </div>
        </div>
        
        <div className={`mt-3 p-3 rounded-xl ${data.net_debt_position <= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Net Debt Position</span>
            <span className={`text-sm font-bold ${data.net_debt_position <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.net_debt_position <= 0 ? 'You are net positive' : 'You are net in debt'}: {formatUGX(Math.abs(data.net_debt_position))}
            </span>
          </div>
        </div>
      </div>

      {/* EMERGENCY FUND */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-600" />
          Emergency Fund
        </h2>
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-800">Available</p>
            <p className="text-xs text-gray-500">For unexpected expenses</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatUGX(data.emergency_fund)}</p>
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
