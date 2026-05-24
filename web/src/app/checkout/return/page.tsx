"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ReturnInner() {
  const search = useSearchParams();
  const router = useRouter();
  const sessionId = search.get("session_id");
  const [msg, setMsg] = useState("確認付款結果…");

  useEffect(() => {
    if (!sessionId) {
      setMsg("缺少付款工作階段資訊");
      return;
    }
    let cancelled = false;
    let n = 0;
    const tick = async () => {
      const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setMsg(data.error || "無法確認訂單");
        return;
      }
      if (data.status === "PAID") {
        router.replace(`/account/orders/${data.orderId}`);
        return;
      }
      n += 1;
      if (n > 40) {
        setMsg("付款處理較久，請至「我的訂單」查看狀態。");
        return;
      }
      setMsg("等待金流回呼確認…（通常幾秒內完成）");
      setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <main className="surface-narrow">
      <div className="card p-8 text-center shadow-soft">
        <p className="text-zinc-800">{msg}</p>
        <p className="mt-4 text-sm text-zinc-600">
          <Link href="/account/orders" className="font-medium text-orange-800 hover:underline">
            前往我的訂單
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="surface-narrow">
          <p className="text-center text-zinc-500">載入中…</p>
        </main>
      }
    >
      <ReturnInner />
    </Suspense>
  );
}
