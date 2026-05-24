"use client";

import { useEffect, useState } from "react";

type StoreMode = "STORE" | "RESTAURANT" | "BOTH";

interface Settings {
  storeName: string;
  logoUrl: string | null;
  mode: StoreMode;
  currency: string;
  announcement: string | null;
  primaryColor: string;
}

const MODE_OPTIONS: { value: StoreMode; label: string; desc: string }[] = [
  { value: "STORE", label: "無人商店", desc: "一般電商流程，宅配 / 自取" },
  { value: "RESTAURANT", label: "餐廳點餐", desc: "桌位 QR 點餐，廚房顯示" },
  { value: "BOTH", label: "雙模式", desc: "同時啟用電商與餐廳功能" },
];

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Settings>({
    storeName: "",
    logoUrl: "",
    mode: "BOTH",
    currency: "TWD",
    announcement: "",
    primaryColor: "#111827",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (data) setForm({
          storeName: data.storeName ?? "",
          logoUrl: data.logoUrl ?? "",
          mode: data.mode ?? "BOTH",
          currency: data.currency ?? "TWD",
          announcement: data.announcement ?? "",
          primaryColor: data.primaryColor ?? "#111827",
        });
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="p-8 text-gray-500">載入中…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">商店設定</h1>

      <form onSubmit={save} className="space-y-6">
        {/* 基本資訊 */}
        <section className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">基本資訊</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">商店名稱</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.storeName}
              onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Logo 圖片 URL</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="https://..."
              value={form.logoUrl ?? ""}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">首頁公告</label>
            <textarea
              className="border rounded-lg px-3 py-2 w-full h-20 resize-none"
              placeholder="留空則不顯示"
              value={form.announcement ?? ""}
              onChange={e => setForm(f => ({ ...f, announcement: e.target.value }))}
            />
          </div>
        </section>

        {/* 商店模式 */}
        <section className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">商店模式</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: opt.value }))}
                className={`border rounded-xl p-3 text-left transition ${
                  form.mode === opt.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "hover:border-gray-400"
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className={`text-xs mt-0.5 ${form.mode === opt.value ? "text-gray-300" : "text-gray-400"}`}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* 其他設定 */}
        <section className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">其他</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">幣別</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                <option value="TWD">TWD 新台幣</option>
                <option value="USD">USD 美元</option>
                <option value="JPY">JPY 日圓</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">主色</label>
              <input
                type="color"
                className="border rounded-lg h-10 w-14 cursor-pointer"
                value={form.primaryColor}
                onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50 font-medium"
        >
          {saving ? "儲存中…" : saved ? "✓ 已儲存" : "儲存設定"}
        </button>
      </form>
    </div>
  );
}
