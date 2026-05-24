"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  code: string;
  type: string;
  value: unknown;
  active: boolean;
  usedCount: number;
  usageLimit: number | null;
};

export default function AdminCouponsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/coupons");
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

  async function onDelete(id: string) {
    if (!confirm("確定刪除此優惠券？")) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("刪除失敗");
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">優惠券</h1>
          <p className="page-subtitle">百分比或固定金額；Stripe 模式下於付款完成後才計入使用次數</p>
        </div>
        <Link href="/admin/coupons/new" className="btn btn-accent">
          新增
        </Link>
      </div>

      <ul className="mt-8 space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
            <div>
              <p className="font-mono font-semibold text-zinc-900">{c.code}</p>
              <p className="text-xs text-zinc-600">
                {c.type === "PERCENT" ? `％ ${String(c.value)}` : `NT$ ${String(c.value)}`} · 已用 {c.usedCount}
                {c.usageLimit != null ? ` / 上限 ${c.usageLimit}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {c.active ? "啟用" : "停用"}
              </span>
              <Link href={`/admin/coupons/${c.id}/edit`} className="btn btn-ghost btn-sm">
                編輯
              </Link>
              <button type="button" className="btn btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={() => onDelete(c.id)}>
                刪除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-8 text-zinc-600">尚無優惠券。</p>}
    </main>
  );
}
