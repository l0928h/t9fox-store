"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KitchenStatus = "PENDING" | "PREPARING" | "READY" | "SERVED";

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  modifiers: { name: string }[];
  notes: string | null;
}

interface KitchenOrder {
  id: string;
  tableNumber: string | null;
  table: { number: string; label: string | null } | null;
  kitchenStatus: KitchenStatus;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<KitchenStatus, { label: string; bg: string; border: string; next: KitchenStatus | null; nextLabel: string }> = {
  PENDING:   { label: "待接單",  bg: "bg-yellow-50",  border: "border-yellow-300", next: "PREPARING", nextLabel: "開始備餐" },
  PREPARING: { label: "備餐中",  bg: "bg-blue-50",    border: "border-blue-300",   next: "READY",     nextLabel: "完成備餐" },
  READY:     { label: "可取餐",  bg: "bg-green-50",   border: "border-green-300",  next: "SERVED",    nextLabel: "已取餐 ✓" },
  SERVED:    { label: "已完成",  bg: "bg-gray-50",    border: "border-gray-200",   next: null,        nextLabel: "" },
};

const COLUMNS: KitchenStatus[] = ["PENDING", "PREPARING", "READY"];

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`;
  return `${Math.floor(diff / 3600)}時前`;
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const prevCountRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  function playAlert() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* audio blocked */ }
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/kitchen/orders");
    if (!res.ok) return;
    const data: KitchenOrder[] = await res.json();
    const pending = data.filter(o => o.kitchenStatus === "PENDING").length;
    if (pending > prevCountRef.current) playAlert();
    prevCountRef.current = pending;
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [load]);

  async function advance(order: KitchenOrder) {
    const next = STATUS_CONFIG[order.kitchenStatus].next;
    if (!next) return;
    setUpdating(order.id);
    await fetch(`/api/kitchen/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kitchenStatus: next }),
    });
    await load();
    setUpdating(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-xl">廚房顯示系統載入中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">廚房顯示</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">每 6 秒自動更新</span>
          <button
            onClick={load}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg"
          >
            重新整理
          </button>
        </div>
      </div>

      {/* 3-column KDS layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(status => {
          const cfg = STATUS_CONFIG[status];
          const columnOrders = orders.filter(o => o.kitchenStatus === status);
          return (
            <div key={status}>
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 mb-3 ${cfg.bg} ${cfg.border} border`}>
                <span className="font-bold text-gray-800">{cfg.label}</span>
                <span className="bg-white text-gray-800 text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-sm">
                  {columnOrders.length}
                </span>
              </div>

              {/* Orders */}
              <div className="space-y-3">
                {columnOrders.map(order => {
                  const tableName = order.table?.label ?? (order.tableNumber ? `${order.tableNumber} 號桌` : "外帶");
                  const cfg2 = STATUS_CONFIG[order.kitchenStatus];
                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border-2 p-4 ${cfg2.bg} ${cfg2.border} transition-all`}
                    >
                      {/* Order header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{tableName}</p>
                          <p className="text-xs text-gray-500 font-mono">{order.id.slice(-8)}</p>
                        </div>
                        <p className="text-xs text-gray-400">{timeAgo(order.createdAt)}</p>
                      </div>

                      {/* Items */}
                      <ul className="space-y-2 mb-3">
                        {order.items.map(item => (
                          <li key={item.id} className="text-sm">
                            <div className="flex items-baseline gap-1.5">
                              <span className="bg-gray-800 text-white text-xs font-bold rounded px-1.5 py-0.5 shrink-0">
                                ×{item.quantity}
                              </span>
                              <span className="font-medium text-gray-900">{item.title}</span>
                            </div>
                            {item.modifiers?.map((m, i) => (
                              <p key={i} className="text-xs text-gray-500 ml-8">{m.name}</p>
                            ))}
                            {item.notes && (
                              <p className="text-xs text-blue-600 ml-8">📝 {item.notes}</p>
                            )}
                          </li>
                        ))}
                      </ul>

                      {order.notes && (
                        <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5 mb-3">
                          📋 {order.notes}
                        </p>
                      )}

                      {/* Action button */}
                      {cfg2.next && (
                        <button
                          onClick={() => advance(order)}
                          disabled={updating === order.id}
                          className={`w-full py-2 rounded-xl font-semibold text-sm transition active:scale-95 disabled:opacity-50 ${
                            order.kitchenStatus === "PENDING"
                              ? "bg-yellow-400 hover:bg-yellow-300 text-yellow-900"
                              : order.kitchenStatus === "PREPARING"
                              ? "bg-blue-500 hover:bg-blue-400 text-white"
                              : "bg-green-500 hover:bg-green-400 text-white"
                          }`}
                        >
                          {updating === order.id ? "更新中…" : cfg2.nextLabel}
                        </button>
                      )}
                    </div>
                  );
                })}

                {columnOrders.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-gray-700 p-6 text-center">
                    <p className="text-gray-600 text-sm">無訂單</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
