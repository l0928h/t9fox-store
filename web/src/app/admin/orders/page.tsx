"use client";

import { useCallback, useEffect, useState } from "react";

const statusMap: Record<string, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  PREPARING: "備餐中",
  READY: "可取餐",
  SHIPPING: "出貨中",
  COMPLETED: "完成",
  CANCELLED: "已取消",
};

const allStatuses = Object.keys(statusMap) as (keyof typeof statusMap)[];

type Order = {
  id: string;
  status: string;
  total: unknown;
  createdAt: string;
  recipient: string;
  phone: string;
  user: { email: string; name: string | null };
  items: { id: string; title: string; quantity: number; price: unknown }[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/orders");
    if (!res.ok) {
      setErr("無法載入");
      return;
    }
    const data: Order[] = await res.json();
    setOrders(data);
    setErr(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

  if (err || orders === null) {
    return (
      <main className="surface-page max-w-4xl">
        <p className="text-zinc-500">{err ?? "載入中…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">訂單管理</h1>
          <p className="page-subtitle">更新訂單狀態（示範後台）</p>
        </div>
        <a
          href="/api/admin/orders/export"
          className="btn btn-ghost btn-sm"
          download
        >
          匯出 CSV
        </a>
      </div>
      <ul className="mt-8 space-y-4">
        {orders.map((o) => (
          <li key={o.id} className="card p-5 text-sm shadow-soft">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-zinc-500">{o.id}</p>
                <p className="mt-1 font-medium text-zinc-900">
                  {o.user.name ?? o.user.email} · {o.recipient} · {o.phone}
                </p>
                <p className="mt-1 text-zinc-600">
                  {new Date(o.createdAt).toLocaleString("zh-TW")} ·{" "}
                  <span className="price">NT$ {String(o.total)}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">{statusMap[o.status]}</span>
                <select
                  className="input cursor-pointer py-2 text-sm"
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                >
                  {allStatuses.map((s) => (
                    <option key={s} value={s}>
                      {statusMap[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ul className="space-y-1 border-t border-zinc-100 pt-3 text-zinc-700">
              {o.items.map((it) => (
                <li key={it.id}>
                  {it.title} × {it.quantity} · NT$ {String(it.price)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
