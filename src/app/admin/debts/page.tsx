"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, X, Landmark, CreditCard, TrendingDown, Calculator, ArrowLeftRight, UserCheck, AlertTriangle } from "lucide-react";
import { formatUGX, fmtPercent } from "@/lib/format";
import { calculatePayoffProgress, getDebtStats, type PayoffProgress } from "@/lib/debt-engine";

interface Debt {
  id: string; name: string; creditor: string; original_amount: number; current_balance: number;
  interest_rate_monthly: number; minimum_payment: number; start_date: string; due_date: string;
  status: string; notes: string; total_paid: number;
}

interface Receivable {
  id: string; name: string; person: string; original_amount: number; current_balance: number;
  interest_rate_monthly: number; start_date: string; due_date: string;
  status: string; notes: string; total_received: number;
}

export default function DebtsPage() {
  const [activeTab, setActiveTab] = useState<"debts" | "receivables">("debts");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPayForm, setShowPayForm] = useState<string | null>(null);
  const [showReceiveForm, setShowReceiveForm] = useState<string | null>(null);
  const [showEngine, setShowEngine] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const [form, setForm] = useState({
    name: "", creditor: "", person: "", original_amount: "", current_balance: "",
    interest_rate_monthly: "", minimum_payment: "", start_date: "", due_date: "", notes: "",
  });
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [receiveForm, setReceiveForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes, iRes] = await Promise.all([
        fetch("/api/debts"),
        fetch("/api/receivables"),
        fetch(`/api/transactions?type=income&month=${new Date().toISOString().slice(0, 7)}`),
      ]);
      const debts = await dRes.json();
      const receivables = await rRes.json();
      const txs = iRes.ok ? await iRes.json() : [];
      console.log("Debts API response:", debts);
      console.log("Receivables API response:", receivables);
      console.log("Transactions API response:", txs);
      setDebts(Array.isArray(debts) ? debts : []);
      setReceivables(Array.isArray(receivables) ? receivables : []);
      setMonthlyIncome((Array.isArray(txs) ? txs : []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0));
    } catch (error) {
      console.error("Error loading debts data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeDebts = (Array.isArray(debts) ? debts : []).filter(d => d.status === "active");
  const totalBalance = activeDebts.reduce((s, d) => s + Number(d.current_balance), 0);
  const totalMinPayments = activeDebts.reduce((s, d) => s + Number(d.minimum_payment), 0);
  const dti = monthlyIncome > 0 ? (totalMinPayments / monthlyIncome) * 100 : 0;

  const activeReceivables = (Array.isArray(receivables) ? receivables : []).filter(r => r.status === "active");
  const totalReceivables = activeReceivables.reduce((s, r) => s + Number(r.current_balance), 0);
  const netDebtPosition = totalBalance - totalReceivables;

  const resetForm = () => {
    setForm({ name: "", creditor: "", person: "", original_amount: "", current_balance: "", interest_rate_monthly: "", minimum_payment: "", start_date: "", due_date: "", notes: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form, original_amount: Number(form.original_amount), current_balance: Number(form.current_balance),
      interest_rate_monthly: Number(form.interest_rate_monthly), minimum_payment: Number(form.minimum_payment),
    };
    if (editId) {
      await fetch("/api/debts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editId, status: "active" }) });
    } else {
      await fetch("/api/debts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    resetForm();
    load();
  };

  const handleSubmitReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name, person: form.person, original_amount: Number(form.original_amount),
      current_balance: Number(form.current_balance), interest_rate_monthly: Number(form.interest_rate_monthly) || 0,
      start_date: form.start_date || null, due_date: form.due_date || null, notes: form.notes || null,
    };
    if (editId) {
      await fetch("/api/receivables", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editId, status: "active" }) });
    } else {
      await fetch("/api/receivables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    resetForm();
    load();
  };

  const handleEdit = (d: Debt) => {
    setForm({
      name: d.name, creditor: d.creditor || "", person: "", original_amount: String(d.original_amount),
      current_balance: String(d.current_balance), interest_rate_monthly: String(d.interest_rate_monthly),
      minimum_payment: String(d.minimum_payment), start_date: d.start_date?.split("T")[0] || "",
      due_date: d.due_date?.split("T")[0] || "", notes: d.notes || "",
    });
    setEditId(d.id);
    setShowForm(true);
  };

  const handleEditReceivable = (r: Receivable) => {
    setForm({
      name: r.name, creditor: "", person: r.person || "", original_amount: String(r.original_amount),
      current_balance: String(r.current_balance), interest_rate_monthly: String(r.interest_rate_monthly),
      minimum_payment: "", start_date: r.start_date?.split("T")[0] || "",
      due_date: r.due_date?.split("T")[0] || "", notes: r.notes || "",
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!confirm("Delete this receivable?")) return;
    await fetch(`/api/receivables?id=${id}`, { method: "DELETE" });
    load();
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/receivables/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receivable_id: showReceiveForm, amount: Number(receiveForm.amount), date: receiveForm.date, notes: receiveForm.notes || null }),
    });
    setShowReceiveForm(null);
    setReceiveForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this debt?")) return;
    await fetch(`/api/debts?id=${id}`, { method: "DELETE" });
    load();
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/debts/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debt_id: showPayForm, amount: Number(payForm.amount), date: payForm.date, notes: payForm.notes || null }),
    });
    setShowPayForm(null);
    setPayForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    load();
  };

  // Payoff progress based on ACTUAL payments
  const payoffProgress: PayoffProgress[] = calculatePayoffProgress(activeDebts.map(d => ({
    id: d.id, name: d.name, current_balance: Number(d.current_balance),
    original_amount: Number(d.original_amount), total_paid: Number(d.total_paid || 0),
    interest_rate_monthly: Number(d.interest_rate_monthly), minimum_payment: Number(d.minimum_payment),
  })));
  const debtStats = getDebtStats(activeDebts.map(d => ({
    id: d.id, name: d.name, current_balance: Number(d.current_balance),
    original_amount: Number(d.original_amount), total_paid: Number(d.total_paid || 0),
    interest_rate_monthly: Number(d.interest_rate_monthly), minimum_payment: Number(d.minimum_payment),
  })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Debts & Receivables</h1>
          <p className="text-sm text-gray-500">What you owe vs what others owe you</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "debts" && (
            <button onClick={() => setShowEngine(!showEngine)} className="flex items-center gap-1 px-3 py-2.5 text-sm border border-wallet-200 text-wallet-700 rounded-xl hover:bg-wallet-50">
              <Calculator className="w-4 h-4" /> Payoff Engine
            </button>
          )}
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-wallet-600 hover:bg-wallet-700 text-white text-sm font-medium rounded-xl transition">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab("debts")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === "debts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Landmark className="w-4 h-4" /> Debts I Owe
        </button>
        <button onClick={() => setActiveTab("receivables")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === "receivables" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <UserCheck className="w-4 h-4" /> Money Owed to Me
        </button>
      </div>

      {/* Summary - shows both always */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-red-50 mb-2"><Landmark className="w-5 h-5 text-red-600" /></div>
          <p className="text-xs text-gray-500">Total Debt</p>
          <p className="text-lg font-bold text-red-600">{formatUGX(totalBalance)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-green-50 mb-2"><UserCheck className="w-5 h-5 text-green-600" /></div>
          <p className="text-xs text-gray-500">Money Owed to Me</p>
          <p className="text-lg font-bold text-green-600">{formatUGX(totalReceivables)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-blue-50 mb-2"><ArrowLeftRight className="w-5 h-5 text-blue-600" /></div>
          <p className="text-xs text-gray-500">Net Position</p>
          <p className={`text-lg font-bold ${netDebtPosition > 0 ? "text-red-600" : "text-green-600"}`}>{formatUGX(Math.abs(netDebtPosition))} {netDebtPosition > 0 ? "owed" : "owed to you"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-orange-50 mb-2"><CreditCard className="w-5 h-5 text-orange-600" /></div>
          <p className="text-xs text-gray-500">Monthly Payments</p>
          <p className="text-lg font-bold text-orange-600">{formatUGX(totalMinPayments)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-blue-50 mb-2"><TrendingDown className="w-5 h-5 text-blue-600" /></div>
          <p className="text-xs text-gray-500">DTI Ratio</p>
          <p className={`text-lg font-bold ${dti > 36 ? "text-red-600" : dti > 20 ? "text-orange-600" : "text-green-600"}`}>{fmtPercent(dti)}</p>
        </div>
      </div>

      {/* Payoff Progress - Always visible */}
      {activeDebts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Calculator className="w-4 h-4 text-wallet-600" /> Payoff Progress</h2>
            <button onClick={() => setShowEngine(!showEngine)} className="text-xs text-wallet-600 hover:underline">
              {showEngine ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Original</p>
              <p className="text-lg font-bold text-gray-900">{formatUGX(debtStats.total_original)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-lg font-bold text-green-600">{formatUGX(debtStats.total_paid)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Progress</p>
              <p className="text-lg font-bold text-wallet-600">{debtStats.percent_paid}%</p>
            </div>
          </div>

          {showEngine && (
            <div className="space-y-3">
              {payoffProgress.map(p => (
                <div key={p.debt_id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{p.debt_name}</p>
                    <span className="text-xs font-medium text-wallet-600">{p.percent_paid}% paid</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-wallet-500 rounded-full transition-all" style={{ width: `${p.percent_paid}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Paid: {formatUGX(p.total_paid)}</span>
                    <span>Remaining: {formatUGX(p.current_balance)}</span>
                  </div>
                  {p.remaining_months !== null && p.current_balance > 0 && (
                    <p className="text-xs text-gray-400 mt-1">~{p.remaining_months} months at minimum payment</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debt Strategy Recommendations */}
      {activeDebts.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><TrendingDown className="w-4 h-4 text-blue-600" /> Payoff Strategy</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-sm font-bold text-gray-900 mb-1">Avalanche (Highest Interest)</p>
              <p className="text-xs text-gray-600">Pay off highest interest rate first to minimize total interest paid</p>
              <p className="text-xs text-wallet-600 mt-2 font-medium">
                Recommended: {activeDebts.reduce((max, d) => Number(d.interest_rate_monthly) > Number(max.interest_rate_monthly) ? d : max).name}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <p className="text-sm font-bold text-gray-900 mb-1">Snowball (Smallest Balance)</p>
              <p className="text-xs text-gray-600">Pay off smallest balance first for psychological wins</p>
              <p className="text-xs text-wallet-600 mt-2 font-medium">
                Recommended: {activeDebts.reduce((min, d) => Number(d.current_balance) < Number(min.current_balance) ? d : min).name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Due Date Alerts */}
      {activeDebts.some(d => d.due_date && new Date(d.due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-600" /> Upcoming Due Dates</h2>
          <div className="space-y-2">
            {activeDebts
              .filter(d => d.due_date && new Date(d.due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .map(d => {
                const daysUntilDue = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                const isUrgent = daysUntilDue <= 7;
                return (
                  <div key={d.id} className={`flex items-center justify-between p-2 rounded-lg ${isUrgent ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-500">Due: {d.due_date?.split('T')[0]}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                      {daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue} days`}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? "Edit" : "New"} {activeTab === "debts" ? "Debt" : "Receivable"}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={activeTab === "debts" ? handleSubmit : handleSubmitReceivable} className="space-y-3">
              <input type="text" placeholder={activeTab === "debts" ? "Debt name" : "Loan name (e.g. Loan to John)"} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              {activeTab === "debts" ? (
                <input type="text" placeholder="Creditor (optional)" value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              ) : (
                <input type="text" placeholder="Person who owes you" value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              )}
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Original amount" value={form.original_amount} onChange={e => setForm(f => ({ ...f, original_amount: e.target.value }))} className="px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
                <input type="number" placeholder="Current balance" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} className="px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.01" placeholder="Monthly rate (%)" value={form.interest_rate_monthly} onChange={e => setForm(f => ({ ...f, interest_rate_monthly: e.target.value }))} className="px-4 py-3 rounded-xl border border-gray-200 text-sm" />
                {activeTab === "debts" && <input type="number" placeholder="Min payment" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} className="px-4 py-3 rounded-xl border border-gray-200 text-sm" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500">Start date</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" /></div>
                <div><label className="text-xs text-gray-500">Due date</label><input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" /></div>
              </div>
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" rows={2} />
              <button type="submit" className="w-full py-3 bg-wallet-600 hover:bg-wallet-700 text-white font-medium rounded-xl transition">{editId ? "Update" : "Save"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowPayForm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Log Payment</h2>
            <form onSubmit={handlePay} className="space-y-3">
              <input type="number" placeholder="Amount (UGX)" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="text" placeholder="Notes (optional)" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition">Record Payment</button>
            </form>
          </div>
        </div>
      )}

      {/* Receive Payment modal */}
      {showReceiveForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowReceiveForm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Record Received Payment</h2>
            <form onSubmit={handleReceive} className="space-y-3">
              <input type="number" placeholder="Amount received (UGX)" value={receiveForm.amount} onChange={e => setReceiveForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="date" value={receiveForm.date} onChange={e => setReceiveForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="text" placeholder="Notes (optional)" value={receiveForm.notes} onChange={e => setReceiveForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition">Record Received</button>
            </form>
          </div>
        </div>
      )}

      {/* List - conditional on active tab */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" /></div>
      ) : activeTab === "debts" ? (
        debts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No debts yet</div>
        ) : (
          <div className="space-y-3">
            {debts.map(d => {
              const pct = Number(d.original_amount) > 0 ? ((Number(d.original_amount) - Number(d.current_balance)) / Number(d.original_amount)) * 100 : 0;
              const incomeImpact = monthlyIncome > 0 ? (Number(d.minimum_payment) / monthlyIncome) * 100 : 0;
              return (
                <div key={d.id} className={`bg-white rounded-2xl border ${d.status === "paid_off" ? "border-green-200 bg-green-50/30" : "border-gray-100"} p-4 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{d.name} {d.status === "paid_off" && <span className="text-green-600 text-xs">PAID OFF</span>}</p>
                      {d.creditor && <p className="text-xs text-gray-400">{d.creditor}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {d.status === "active" && <button onClick={() => setShowPayForm(d.id)} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Pay</button>}
                      <button onClick={() => handleEdit(d)} className="p-1 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                    <div><span className="text-gray-400">Balance</span><p className="font-bold text-red-600">{formatUGX(Number(d.current_balance))}</p></div>
                    <div><span className="text-gray-400">Rate/mo</span><p className="font-bold">{Number(d.interest_rate_monthly).toFixed(1)}%</p></div>
                    <div><span className="text-gray-400">Min pay</span><p className="font-bold">{formatUGX(Number(d.minimum_payment))}</p></div>
                    <div><span className="text-gray-400">% of income</span><p className={`font-bold ${incomeImpact > 20 ? "text-red-600" : "text-gray-700"}`}>{fmtPercent(incomeImpact)}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-wallet-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{Math.round(pct)}% paid</span>
                  </div>
                  {d.notes && <p className="text-xs text-gray-400 mt-2">{d.notes}</p>}
                </div>
              );
            })}
          </div>
        )
      ) : (
        receivables.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No receivables yet. Add money others owe you.</div>
        ) : (
          <div className="space-y-3">
            {receivables.map(r => {
              const pct = Number(r.original_amount) > 0 ? ((Number(r.total_received) || 0) / Number(r.original_amount)) * 100 : 0;
              return (
                <div key={r.id} className={`bg-white rounded-2xl border ${r.status === "paid_off" ? "border-green-200 bg-green-50/30" : "border-gray-100"} p-4 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.name} {r.status === "paid_off" && <span className="text-green-600 text-xs">PAID OFF</span>}</p>
                      {r.person && <p className="text-xs text-gray-400">{r.person}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {r.status === "active" && <button onClick={() => setShowReceiveForm(r.id)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Receive</button>}
                      <button onClick={() => handleEditReceivable(r)} className="p-1 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDeleteReceivable(r.id)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div><span className="text-gray-400">Balance Owed</span><p className="font-bold text-green-600">{formatUGX(Number(r.current_balance))}</p></div>
                    <div><span className="text-gray-400">Rate/mo</span><p className="font-bold">{Number(r.interest_rate_monthly).toFixed(1)}%</p></div>
                    <div><span className="text-gray-400">Due</span><p className="font-bold">{r.due_date ? r.due_date.split("T")[0] : "—"}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{Math.round(pct)}% received</span>
                  </div>
                  {r.notes && <p className="text-xs text-gray-400 mt-2">{r.notes}</p>}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
