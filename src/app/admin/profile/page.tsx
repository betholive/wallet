"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Check, AlertCircle } from "lucide-react";

export default function AccountPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ current: "", new: "", confirm: "" });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (form.new !== form.confirm) {
      setMessage({ text: "New passwords don't match", type: "error" });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session?.user?.email, current_password: form.current, new_password: form.new }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ text: "Password updated successfully", type: "success" });
      setForm({ current: "", new: "", confirm: "" });
    } else {
      setMessage({ text: data.error || "Failed to update password", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Manage your settings</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-2">Profile</p>
        <p className="text-sm text-gray-600"><span className="text-gray-400">Email:</span> {session?.user?.email}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-wallet-50"><Lock className="w-4 h-4 text-wallet-600" /></div>
          <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
        </div>

        {message && (
          <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" placeholder="Current password" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
          <input type="password" placeholder="New password" value={form.new} onChange={e => setForm(f => ({ ...f, new: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
          <input type="password" placeholder="Confirm new password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" required />
          <button type="submit" disabled={loading} className="w-full py-3 bg-wallet-600 hover:bg-wallet-700 disabled:bg-wallet-400 text-white font-medium rounded-xl transition">{loading ? "Updating..." : "Update Password"}</button>
        </form>
      </div>
    </div>
  );
}
