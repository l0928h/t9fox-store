"use client";

import { useEffect, useState } from "react";

type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

interface Table {
  id: string;
  number: string;
  label: string | null;
  capacity: number;
  status: TableStatus;
  qrToken: string;
}

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "空桌",
  OCCUPIED: "使用中",
  RESERVED: "已預約",
};

const STATUS_COLOR: Record<TableStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-red-100 text-red-800",
  RESERVED: "bg-yellow-100 text-yellow-800",
};

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ number: "", label: "", capacity: "2" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/tables");
    setTables(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
    });
    if (res.ok) {
      setForm({ number: "", label: "", capacity: "2" });
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "新增失敗");
    }
    setSaving(false);
  }

  async function deleteTable(id: string, number: string) {
    if (!confirm(`確定刪除「${number}」桌？`)) return;
    await fetch(`/api/admin/tables/${id}`, { method: "DELETE" });
    await load();
  }

  async function resetQr(id: string) {
    // PATCH with a flag to regenerate qrToken
    await fetch(`/api/admin/tables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: crypto.randomUUID() }),
    });
    await load();
  }

  function qrUrl(token: string) {
    return `${window.location.origin}/order/${token}`;
  }

  if (loading) return <div className="p-8 text-gray-500">載入中…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">桌位管理</h1>

      {/* 新增桌位 */}
      <form onSubmit={addTable} className="bg-white border rounded-xl p-5 mb-8 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">桌號 <span className="text-red-500">*</span></label>
          <input
            className="border rounded-lg px-3 py-2 w-24"
            placeholder="A1"
            value={form.number}
            onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">顯示名稱</label>
          <input
            className="border rounded-lg px-3 py-2 w-40"
            placeholder="靠窗一號桌"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">座位數</label>
          <input
            type="number"
            min="0"
            className="border rounded-lg px-3 py-2 w-20"
            value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          新增桌位
        </button>
        {error && <p className="text-red-500 text-sm w-full">{error}</p>}
      </form>

      {/* 桌位列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(t => (
          <div key={t.id} className="bg-white border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold">{t.number}</p>
                {t.label && <p className="text-sm text-gray-500">{t.label}</p>}
                <p className="text-xs text-gray-400">{t.capacity} 人座</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>

            {/* QR Code URL */}
            <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-500 break-all">
              {qrUrl(t.qrToken)}
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => navigator.clipboard.writeText(qrUrl(t.qrToken))}
                className="flex-1 text-xs border rounded-lg py-1.5 hover:bg-gray-50"
              >
                複製連結
              </button>
              <button
                onClick={() => resetQr(t.id)}
                className="flex-1 text-xs border rounded-lg py-1.5 hover:bg-gray-50"
              >
                重置 QR
              </button>
              <button
                onClick={() => deleteTable(t.id, t.number)}
                className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
              >
                刪除
              </button>
            </div>
          </div>
        ))}

        {tables.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-12">尚無桌位，請新增。</p>
        )}
      </div>
    </div>
  );
}
