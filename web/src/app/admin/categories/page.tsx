"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = { id: string; name: string; slug: string; _count?: { products: number } };

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) {
      setErr("無法載入");
      return;
    }
    const data: Row[] = await res.json();
    setRows(data);
    setErr(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormErr(data.error || "建立失敗");
        return;
      }
      setName("");
      setSlug("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("確定刪除此分類？（需無關聯商品）")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "刪除失敗");
      return;
    }
    await load();
  }

  if (err || rows === null) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-zinc-500">{err ?? "載入中…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/admin/products" className="text-sm font-medium text-orange-800 hover:underline">
          ← 返回後台
        </Link>
        <h1 className="page-title mt-4">分類管理</h1>
        <p className="page-subtitle">建立與刪除商品分類（有商品時無法刪除）</p>
      </div>

      <form onSubmit={onCreate} className="card mb-8 space-y-4 p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-zinc-900">新增分類</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">名稱</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
        </div>
        {formErr && <p className="text-sm text-red-700">{formErr}</p>}
        <button type="submit" disabled={saving} className="btn btn-accent btn-sm">
          {saving ? "建立中…" : "建立"}
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
            <div>
              <p className="font-medium text-zinc-900">{c.name}</p>
              <p className="font-mono text-xs text-zinc-500">
                {c.slug} · {c._count?.products ?? 0} 件商品
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={() => onDelete(c.id)}>
              刪除
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
