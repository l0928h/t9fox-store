"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function PaymentHint() {
  const [mode, setMode] = useState<"demo" | "stripe" | null>(null);
  useEffect(() => {
    fetch("/api/checkout/config")
      .then((r) => r.json())
      .then((d) => setMode(d.provider ?? "demo"))
      .catch(() => setMode("demo"));
  }, []);
  if (mode === null) return null;
  if (mode === "stripe") {
    return (
      <p className="mt-3 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950/90">
        已啟用 <strong>Stripe</strong> 測試金流：送出後將前往 Stripe Checkout，付款完成後訂單才會變為「已付款」，並扣除庫存。
      </p>
    );
  }
  return (
    <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950/90">
      目前為 <strong>示範模式</strong>（<code className="text-xs">PAYMENT_PROVIDER</code> 非 stripe
      或未設定金鑰）：送出後即視為已付款。
    </p>
  );
}

export default function CheckoutPage() {
  const { status } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const cancelled = search.get("cancelled") === "1";
  const cancelledOrderId = search.get("order");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<{
    subtotal: string;
    discount: string;
    total: string;
    itemCount: number;
    couponError: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    recipient: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
  });

  const refreshQuote = useCallback(async () => {
    if (status !== "authenticated") return;
    const res = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode: couponCode.trim() || null }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setQuote(data);
  }, [status, couponCode]);

  useEffect(() => {
    if (status === "authenticated") void refreshQuote();
  }, [status, refreshQuote]);

  useEffect(() => {
    if (status !== "authenticated" || !cancelled || !cancelledOrderId) return;
    void fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: cancelledOrderId }),
    }).then(() => {
      window.dispatchEvent(new Event("t9fox-cart-updated"));
      void refreshQuote();
    });
  }, [status, cancelled, cancelledOrderId, refreshQuote]);

  if (status === "unauthenticated") {
    return (
      <main className="surface-narrow">
        <div className="card p-8 text-center shadow-soft">
          <p className="text-zinc-600">
            請先{" "}
            <Link className="font-medium text-orange-800 hover:underline" href="/login?callbackUrl=/checkout">
              登入
            </Link>
            。
          </p>
        </div>
      </main>
    );
  }
  if (status === "loading") {
    return (
      <main className="surface-narrow">
        <p className="text-center text-zinc-500">載入中…</p>
      </main>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country: "TW",
          couponCode: couponCode.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "結帳失敗");
        return;
      }
      if (data.mode === "stripe" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      router.push("/account/orders?new=" + data.id);
    } catch {
      setMsg("網路錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="surface-narrow">
      <div className="card p-8 shadow-soft sm:p-10">
        <h1 className="page-title">收貨資訊</h1>
        {cancelled && (
          <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            已取消付款，購物車內容已恢復（若先前建立待付款訂單失敗則略過）。
          </p>
        )}
        <PaymentHint />

        <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="label">優惠碼（選填）</label>
              <input
                className="input font-mono uppercase"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="例：WELCOME10"
              />
            </div>
            <button type="button" className="btn btn-ghost btn-sm mb-0.5" onClick={() => void refreshQuote()}>
              試算
            </button>
          </div>
          {quote && quote.itemCount === 0 && <p className="mt-2 text-zinc-600">購物車是空的。</p>}
          {quote && quote.itemCount > 0 && (
            <dl className="mt-3 grid gap-1 text-zinc-700">
              <div className="flex justify-between">
                <dt>小計</dt>
                <dd className="tabular-nums">NT$ {quote.subtotal}</dd>
              </div>
              <div className="flex justify-between">
                <dt>折扣</dt>
                <dd className="tabular-nums text-orange-800">− NT$ {quote.discount}</dd>
              </div>
              <div className="flex justify-between font-semibold text-zinc-900">
                <dt>應付</dt>
                <dd className="price tabular-nums">NT$ {quote.total}</dd>
              </div>
              {quote.couponError && <p className="text-xs text-red-700">{quote.couponError}</p>}
            </dl>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="label">收件人</label>
            <input
              required
              className="input"
              value={form.recipient}
              onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">手機</label>
            <input
              required
              className="input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">郵遞區號</label>
            <input
              required
              className="input"
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">城市 / 鄉鎮</label>
            <input
              required
              className="input"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">地址</label>
            <input
              required
              className="input"
              value={form.line1}
              onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">補充（選填）</label>
            <input
              className="input"
              value={form.line2}
              onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
            />
          </div>
          {msg && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</p>
          )}
          <button type="submit" disabled={loading} className="btn btn-accent w-full">
            {loading ? "處理中…" : "前往結帳"}
          </button>
        </form>
      </div>
    </main>
  );
}
