"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, Landmark, PiggyBank, CreditCard, Wallet, RefreshCw
} from "lucide-react";
import { formatUGX, formatMonth } from "@/lib/format";
import { motion, AnimatePresence } from "motion/react";

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

interface DashboardData {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  surplus: number;
  effective_month: string;
  
  accounts: Account[];
  
  savings_goals: SavingsGoal[];
  total_savings: number;
  emergency_fund: number;
  payable_debts: number;
  receivable_amount: number;
  net_debt_position: number;
  total_assets: number;
}

export default function AccountsPage() {
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
  const debtAccounts = (data.accounts || []).filter(a => a.type === 'debt');
  const receivableAccounts = (data.accounts || []).filter(a => a.type === 'receivable');
  
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, d) => s + d.balance, 0);
  
  const gradeColors = {
    excellent: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    strong: { bg: 'bg-teal-100', text: 'text-teal-700', bar: 'bg-teal-500' },
    progressing: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
    struggling: { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
    critical: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  };
  const grade = gradeColors.critical;

  return (
    <div className="space-y-4 pb-20">
      {/* Header with Month Selector */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts & Bookkeeping</h1>
          <p className="text-sm text-gray-500">{data.effective_month ? formatMonth(data.effective_month) : 'Current Month'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-wallet-500 focus:border-transparent transition"
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={load} 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* INCOME STATEMENT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.1)" }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <motion.div 
            className="p-2 rounded-xl bg-emerald-50"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </motion.div>
          Income Statement
        </h2>
        <div className="space-y-3">
          <motion.div 
            className="flex justify-between items-center py-3 border-b border-gray-100"
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-sm text-gray-600 font-medium">Total Income</span>
            <span className="text-sm font-bold text-emerald-600">{formatUGX(data.monthly_income)}</span>
          </motion.div>
          <motion.div 
            className="flex justify-between items-center py-3 border-b border-gray-100"
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-sm text-gray-600 font-medium">Total Expenses</span>
            <span className="text-sm font-bold text-red-600">{formatUGX(data.monthly_expenses)}</span>
          </motion.div>
          <motion.div 
            className={`flex justify-between items-center py-3 px-4 rounded-xl ${data.surplus >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-sm font-semibold text-gray-700">Net Income</span>
            <span className={`text-sm font-bold ${data.surplus >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.surplus >= 0 ? '+' : ''}{formatUGX(data.surplus)}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* BALANCE SHEET */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.1)" }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <motion.div 
            className="p-2 rounded-xl bg-blue-50"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Landmark className="w-4 h-4 text-blue-600" />
          </motion.div>
          Balance Sheet
        </h2>
        <div className="space-y-5">
          {/* Assets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Assets</p>
            <div className="space-y-3">
              <motion.div 
                className="flex justify-between items-center py-2"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-sm text-gray-600">Cash & Savings</span>
                <span className="text-sm font-semibold text-gray-800">{formatUGX(data.total_savings)}</span>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center py-2"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-sm text-gray-600">Receivables (owed to you)</span>
                <span className="text-sm font-semibold text-gray-800">{formatUGX(data.receivable_amount)}</span>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center py-2"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-sm text-gray-600">Other Assets</span>
                <span className="text-sm font-semibold text-gray-800">{formatUGX(data.total_assets)}</span>
              </motion.div>
              <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-semibold">
                <span className="text-sm text-gray-700">Total Assets</span>
                <span className="text-lg font-bold text-emerald-600">{formatUGX(totalAssets)}</span>
              </div>
            </div>
          </div>
          
          {/* Liabilities */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Liabilities</p>
            <div className="space-y-3">
              <motion.div 
                className="flex justify-between items-center py-2"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-sm text-gray-600">Payable Debts (you owe)</span>
                <span className="text-sm font-semibold text-gray-800">{formatUGX(data.payable_debts)}</span>
              </motion.div>
              <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-semibold">
                <span className="text-sm text-gray-700">Total Liabilities</span>
                <span className="text-lg font-bold text-red-600">{formatUGX(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Net Worth */}
          <motion.div 
            className={`flex justify-between items-center py-4 px-4 rounded-xl ${grade.bg}`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-sm font-bold text-gray-700">Net Worth (Equity)</span>
            <span className={`text-xl font-bold ${grade.text}`}>{formatUGX(data.net_worth)}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* SAVINGS GOALS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.1)" }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <motion.div 
              className="p-2 rounded-xl bg-purple-50"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <PiggyBank className="w-4 h-4 text-purple-600" />
            </motion.div>
            Savings Goals
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/savings')}
            className="text-xs text-wallet-600 hover:underline font-medium"
          >
            Manage →
          </motion.button>
        </div>
        
        <AnimatePresence>
          {data.savings_goals && data.savings_goals.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {data.savings_goals.map((goal, index) => (
                <motion.div 
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl border border-purple-100"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{goal.goal_label || goal.name}</p>
                      <p className="text-xs text-gray-500">{formatUGX(goal.current_balance)} of {formatUGX(goal.target_amount)}</p>
                    </div>
                    <motion.span 
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${goal.progress >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {goal.progress.toFixed(0)}%
                    </motion.span>
                  </div>
                  <div className="h-2.5 bg-purple-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: String(Math.min(goal.progress, 100)) + '%' }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                    />
                  </div>
                  {goal.remaining > 0 && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.5 }}
                      className="text-xs text-gray-500 mt-2"
                    >
                      {formatUGX(goal.remaining)} remaining
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-400"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-50" />
              </motion.div>
              <p className="text-sm">No savings goals set</p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/admin/savings')}
                className="mt-3 text-xs text-wallet-600 hover:underline font-medium"
              >
                Create a goal
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* DEBT POSITION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.1)" }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <motion.div 
              className="p-2 rounded-xl bg-red-50"
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CreditCard className="w-4 h-4 text-red-600" />
            </motion.div>
            Debt Position
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/debts')}
            className="text-xs text-wallet-600 hover:underline font-medium"
          >
            Manage →
          </motion.button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-100"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <p className="text-xs text-gray-500 font-medium">You Owe (Payable)</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatUGX(data.payable_debts)}</p>
            <p className="text-xs text-gray-400 mt-1">{debtAccounts.length} debts</p>
          </motion.div>
          <motion.div 
            className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-100"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <p className="text-xs text-gray-500 font-medium">Owed to You (Receivable)</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatUGX(data.receivable_amount)}</p>
            <p className="text-xs text-gray-400 mt-1">{receivableAccounts.length} receivables</p>
          </motion.div>
        </div>
        
        <motion.div 
          className={`mt-4 p-4 rounded-xl border ${data.net_debt_position <= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Net Debt Position</span>
            <span className={`text-sm font-bold ${data.net_debt_position <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.net_debt_position <= 0 ? 'You are net positive' : 'You are net in debt'}: {formatUGX(Math.abs(data.net_debt_position))}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* EMERGENCY FUND */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.1)" }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <motion.div 
            className="p-2 rounded-xl bg-blue-50"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Wallet className="w-4 h-4 text-blue-600" />
          </motion.div>
          Emergency Fund
        </h2>
        <motion.div 
          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-100"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">Available</p>
            <p className="text-xs text-gray-500">For unexpected expenses</p>
          </div>
          <motion.p 
            className="text-2xl font-bold text-blue-600"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.6 }}
          >
            {formatUGX(data.emergency_fund)}
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
