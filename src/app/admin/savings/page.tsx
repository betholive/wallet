"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, X, PiggyBank, ArrowUpCircle, Wallet } from "lucide-react";
import { formatUGX, fmtPercent } from "@/lib/format";

interface SavingsAccount {
  id: string; name: string; type: string; current_balance: number; target_amount: number | null;
  annual_rate: number | null; goal_label: string | null; partners: string | null; notes: string | null;
}

export default function SavingsPage() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showTxForm, setShowTxForm] = useState<{ id: string; type: string } | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const [form, setForm] = useState({ name: "", type: "fixed", current_balance: "", target_amount: "", annual_rate: "", goal_label: "", partners: "", notes: "" });
  const [txForm, setTxForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, iRes] = await Promise.all([
      fetch("/api/savings"),
      fetch(`/api/transactions?type=income&month=${new Date().toISOString().slice(0, 7)}`),
    ]);
    const accounts = await sRes.json();
    const txs = await iRes.json();
    console.log("Savings API response:", accounts);
    console.log("Transactions API response:", txs);
    setAccounts(Array.isArray(accounts) ? accounts : []);
    setMonthlyIncome((Array.isArray(txs) ? txs : []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: "", type: "fixed", current_balance: "", target_amount: "", annual_rate: "", goal_label: "", partners: "", notes: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form, current_balance: Number(form.current_balance),
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      annual_rate: form.annual_rate ? Number(form.annual_rate) : null,
    };
    if (editId) {
      await fetch("/api/savings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editId }) });
    } else {
      await fetch("/api/savings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    resetForm();
    load();
  };

  const handleEdit = (a: SavingsAccount) => {
    setForm({
      name: a.name, type: a.type, current_balance: String(a.current_balance),
      target_amount: a.target_amount ? String(a.target_amount) : "",
      annual_rate: a.annual_rate ? String(a.annual_rate) : "",
      goal_label: a.goal_label || "", partners: a.partners || "", notes: a.notes || "",
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    await fetch(`/api/savings?id=${id}`, { method: "DELETE" });
    load();
  };

  const handleTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTxForm) return;
    await fetch("/api/savings/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        savings_account_id: showTxForm.id,
        type: showTxForm.type, amount: Number(txForm.amount),
        date: txForm.date, notes: txForm.notes || null,
      }),
    });
    setShowTxForm(null);
    setTxForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    load();
  };

  const totalSavings = accounts.reduce((s, a) => s + Number(a.current_balance), 0);
  const emergencyFund = accounts.filter(a => a.type === "emergency").reduce((s, a) => s + Number(a.current_balance), 0);
  const monthlyExpenses = 0; // approximate
  const emergencyMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  const savingsRate = monthlyIncome > 0 ? (0 / monthlyIncome) * 100 : 0;

  const grouped = [
    { key: "fixed", label: "Fixed Savings (goals)", icon: PiggyBank },
    { key: "emergency", label: "Emergency Fund", icon: Wallet },
    { key: "shared_investment", label: "Shared Investments", icon: ArrowUpCircle },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Savings</h1>
          <p className="text-sm text-gray-500">Grow your wealth</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-wallet-600 hover:bg-wallet-700 text-white text-sm font-medium rounded-xl transition"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-wallet-50 mb-2"><PiggyBank className="w-5 h-5 text-wallet-600" /></div>
          <p className="text-xs text-gray-500">Total Savings</p>
          <p className="text-lg font-bold text-wallet-700">{formatUGX(totalSavings)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Emergency Fund</p>
          <p className="text-lg font-bold text-emerald-600">{formatUGX(emergencyFund)}</p>
          <p className="text-xs text-gray-400">~{emergencyMonths.toFixed(1)} months coverage</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Savings Rate</p>
          <p className="text-lg font-bold text-blue-600">{fmtPercent(savingsRate)}</p>
          <p className="text-xs text-gray-400">of monthly income</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Accounts</p>
          <p className="text-lg font-bold text-gray-900">{accounts.length}</p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? "Edit" : "New"} Account</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Account name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm">
                <option value="fixed">Fixed Savings (goal-based)</option>
                <option value="emergency">Emergency Wallet</option>
                <option value="shared_investment">Shared Investment</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Current balance" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} className="px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
                <input type="number" placeholder="Target amount" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} className="px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              </div>
              <input type="number" step="0.01" placeholder="Annual rate (%) for daily accrual" value={form.annual_rate} onChange={e => setForm(f => ({ ...f, annual_rate: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <input type="text" placeholder="Goal label (e.g. 'House down payment')" value={form.goal_label} onChange={e => setForm(f => ({ ...f, goal_label: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <input type="text" placeholder="Partners (if shared, e.g. 'With John')" value={form.partners} onChange={e => setForm(f => ({ ...f, partners: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <button type="submit" className="w-full py-3 bg-wallet-600 hover:bg-wallet-700 text-white font-medium rounded-xl transition">{editId ? "Update" : "Save"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction modal */}
      {showTxForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowTxForm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{showTxForm.type === "deposit" ? "Deposit" : "Withdraw"}</h2>
            <form onSubmit={handleTx} className="space-y-3">
              <input type="number" placeholder="Amount (UGX)" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="text" placeholder="Notes" value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <button type="submit" className={`w-full py-3 text-white font-medium rounded-xl transition ${showTxForm.type === "deposit" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}>Record {showTxForm.type}</button>
            </form>
          </div>
        </div>
      )}

      {/* Grouped accounts */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No savings accounts yet</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(g => {
            const items = accounts.filter(a => a.type === g.key);
            if (items.length === 0) return null;
            return (
              <div key={g.key}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><g.icon className="w-4 h-4 text-wallet-600" /> {g.label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(a => {
                    const pct = a.target_amount ? Math.min((Number(a.current_balance) / Number(a.target_amount)) * 100, 100) : 0;
                    return (
                      <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{a.name}</p>
                            {a.partners && <p className="text-xs text-gray-400">{a.partners}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(a)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                            <button onClick={() => handleDelete(a.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <p className="text-lg font-bold text-wallet-700">{formatUGX(Number(a.current_balance))}</p>
                          {a.target_amount && <p className="text-xs text-gray-400">Target: {formatUGX(Number(a.target_amount))} • {fmtPercent(pct)}</p>}
                        </div>
                        {a.target_amount && (
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-wallet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                        {a.annual_rate && (
                          <p className="text-xs text-green-600">{a.annual_rate}% annual rate • Daily accrual</p>
                        )}
                        {a.goal_label && <p className="text-xs text-gray-500 mt-1">{a.goal_label}</p>}
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setShowTxForm({ id: a.id, type: "deposit" })} className="flex-1 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Deposit</button>
                          <button onClick={() => setShowTxForm({ id: a.id, type: "withdrawal" })} className="flex-1 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100">Withdraw</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
