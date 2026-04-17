"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, X, Building2, PieChart } from "lucide-react";
import { formatUGX, formatDate } from "@/lib/format";
import { PieChart as RePie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Asset {
  id: string; name: string; category: string; estimated_value: number; purchase_date: string | null; notes: string | null;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", category: "property", estimated_value: "", purchase_date: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/assets");
    const assets = await res.json();
    console.log("Assets API response:", assets);
    setAssets(Array.isArray(assets) ? assets : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: "", category: "property", estimated_value: "", purchase_date: "", notes: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, estimated_value: Number(form.estimated_value) };
    if (editId) {
      await fetch("/api/assets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editId }) });
    } else {
      await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    resetForm();
    load();
  };

  const handleEdit = (a: Asset) => {
    setForm({ name: a.name, category: a.category, estimated_value: String(a.estimated_value), purchase_date: a.purchase_date?.split("T")[0] || "", notes: a.notes || "" });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
    load();
  };

  const totalValue = assets.reduce((s, a) => s + Number(a.estimated_value), 0);

  const catColors: Record<string, string> = { property: "#3b82f6", vehicle: "#f59e0b", investment: "#10b981", other: "#6b7280" };
  const byCategory = assets.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + Number(a.estimated_value);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value, color: catColors[name] || "#8884d8" }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500">Everything you own</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-wallet-600 hover:bg-wallet-700 text-white text-sm font-medium rounded-xl transition"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-blue-50 mb-2"><Building2 className="w-5 h-5 text-blue-600" /></div>
          <p className="text-xs text-gray-500">Total Assets</p>
          <p className="text-lg font-bold text-blue-700">{formatUGX(totalValue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500">Items</p>
          <p className="text-lg font-bold text-gray-900">{assets.length}</p>
        </div>
      </div>

      {/* Pie chart */}
      {assets.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><PieChart className="w-4 h-4 text-wallet-600" /><h2 className="text-sm font-semibold text-gray-700">Breakdown by Category</h2></div>
          <ResponsiveContainer width="100%" height={200}>
            <RePie>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={3}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={v => formatUGX(Number(v))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </RePie>
          </ResponsiveContainer>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? "Edit" : "New"} Asset</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Asset name (e.g. 'Kira Plot 45')" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm">
                <option value="property">Property / Real Estate</option>
                <option value="vehicle">Vehicle</option>
                <option value="investment">Investment</option>
                <option value="other">Other</option>
              </select>
              <input type="number" placeholder="Estimated value (UGX)" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
              <input type="date" placeholder="Purchase date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" rows={2} />
              <button type="submit" className="w-full py-3 bg-wallet-600 hover:bg-wallet-700 text-white font-medium rounded-xl transition">{editId ? "Update" : "Save"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Asset list */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-wallet-200 border-t-wallet-600 rounded-full animate-spin" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No assets yet</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {assets.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{a.name}</p>
                <p className="text-xs text-gray-400">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1" style={{ backgroundColor: catColors[a.category] + "20", color: catColors[a.category] }}>{a.category}</span>
                  {a.purchase_date && formatDate(a.purchase_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">{formatUGX(Number(a.estimated_value))}</span>
                <button onClick={() => handleEdit(a)} className="p-1 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                <button onClick={() => handleDelete(a.id)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
