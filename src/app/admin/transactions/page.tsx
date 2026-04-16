"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, X, ArrowUpCircle, ArrowDownCircle, RefreshCw, Filter } from "lucide-react";
import { formatUGX, formatDate, currentMonth } from "@/lib/format";

interface Category { id: string; name: string; type: string; color: string; }
interface Transaction {
  id: string; type: string; amount: number; category_id: string;
  description: string; date: string; is_recurring: boolean; recurrence: string | null;
  category_name: string; category_color: string;
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState(currentMonth());

  const [form, setForm] = useState({
    type: "expense", amount: "", category_id: "", description: "", date: new Date().toISOString().split("T")[0],
    is_recurring: false, recurrence: "" as string,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterMonth) params.set("month", filterMonth);
    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch("/api/categories"),
    ]);
    setTxs(await txRes.json());
    setCategories(await catRes.json());
    setLoading(false);
  }, [filterType, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const filteredCats = categories.filter(c => c.type === form.type);

  const resetForm = () => {
    setForm({ type: "expense", amount: "", category_id: "", description: "", date: new Date().toISOString().split("T")[0], is_recurring: false, recurrence: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount), is_recurring: form.is_recurring, recurrence: form.recurrence || null };
    if (editId) {
      await fetch("/api/transactions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editId }) });
    } else {
      await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    resetForm();
    load();
  };

  const handleEdit = (tx: Transaction) => {
    setForm({
      type: tx.type, amount: String(tx.amount), category_id: tx.category_id || "",
      description: tx.description || "", date: tx.date?.split("T")[0] || "",
      is_recurring: tx.is_recurring, recurrence: tx.recurrence || "",
    });
    setEditId(tx.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    load();
  };

  const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">Income & expenses</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-wallet-600 hover:bg-wallet-700 text-white text-sm font-medium rounded-xl transition">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Income</p>
          <p className="text-lg font-bold text-green-600">{formatUGX(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Expenses</p>
          <p className="text-lg font-bold text-red-600">{formatUGX(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Net</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatUGX(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm">
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? "Edit" : "New"} Transaction</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, type: "income", category_id: "" }))} className={`py-2.5 rounded-xl text-sm font-medium border ${form.type === "income" ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-500"}`}>Income</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, type: "expense", category_id: "" }))} className={`py-2.5 rounded-xl text-sm font-medium border ${form.type === "expense" ? "bg-red-50 border-red-300 text-red-700" : "border-gray-200 text-gray-500"}`}>Expense</button>
              </div>
              <input type="number" placeholder="Amount (UGX)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required>
                <option value="">Select category</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} className="rounded" />
                Recurring
              </label>
              {form.is_recurring && (
                <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              )}
              <button type="submit" className="w-full py-3 bg-wallet-600 hover:bg-wallet-700 text-white font-medium rounded-xl transition">
                {editId ? "Update" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" />
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No transactions found</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {txs.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {tx.type === "income" ? (
                  <ArrowDownCircle className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {tx.description || tx.category_name || "—"}
                    {tx.is_recurring && <RefreshCw className="inline w-3 h-3 ml-1 text-gray-400" />}
                  </p>
                  <p className="text-xs text-gray-400">
                    {tx.category_name && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1" style={{ backgroundColor: tx.category_color + "20", color: tx.category_color }}>{tx.category_name}</span>}
                    {formatDate(tx.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatUGX(Number(tx.amount))}
                </span>
                <button onClick={() => handleEdit(tx)} className="p-1 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                <button onClick={() => handleDelete(tx.id)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
