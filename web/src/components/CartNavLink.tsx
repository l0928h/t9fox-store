"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export function CartNavLink() {
  const { status } = useSession();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items as { quantity: number }[] | undefined;
      const n = items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
      setCount(n);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    void refresh();
  }, [status, refresh]);

  useEffect(() => {
    const onUpd = () => void refresh();
    window.addEventListener("t9fox-cart-updated", onUpd);
    window.addEventListener("focus", onUpd);
    return () => {
      window.removeEventListener("t9fox-cart-updated", onUpd);
      window.removeEventListener("focus", onUpd);
    };
  }, [refresh]);

  return (
    <Link href="/cart" className="nav-link inline-flex items-center gap-1.5">
      購物車
      {count > 0 && (
        <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white tabular-nums shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
