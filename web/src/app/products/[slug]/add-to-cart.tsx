"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { id: string; name: string; price: string; stock: number };

export function AddToCart({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const v = variants.find((x) => x.id === variantId);

  async function onAdd() {
    setMsg(null);
    if (!variantId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: qty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "失敗");
        return;
      }
      window.dispatchEvent(new Event("t9fox-cart-updated"));
      router.push("/cart");
    } catch {
      setMsg("網路錯誤");
    } finally {
      setLoading(false);
    }
  }

  if (variants.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        此商品暫無可販售規格
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label">規格</label>
        <select
          className="input cursor-pointer"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {variants.map((x) => (
            <option key={x.id} value={x.id} disabled={x.stock < 1}>
              {x.name} — NT$ {x.price}（庫存 {x.stock}）
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">數量</label>
        <input
          type="number"
          min={1}
          max={v?.stock ?? 1}
          className="input w-28"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>
      {msg && <p className="text-sm font-medium text-red-600">{msg}</p>}
      <button
        type="button"
        disabled={loading || !v || v.stock < 1}
        onClick={onAdd}
        className="btn btn-accent w-full"
      >
        {loading ? "處理中…" : "加入購物車"}
      </button>
    </div>
  );
}
