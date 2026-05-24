"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

type Item = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    sku: string;
    name: string;
    price: unknown;
    stock: number;
    product: { title: string; images: { url: string }[] };
  };
};

export default function CartPage() {
  const { status } = useSession();
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/cart");
    if (!res.ok) {
      setErr("讀取購物車失敗");
      return;
    }
    const data = await res.json();
    setItems(data.items);
    setErr(null);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    load();
  }, [status, load]);

  async function setQty(itemId: string, quantity: number) {
    const res = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event("t9fox-cart-updated"));
      load();
    }
  }

  if (status === "loading" || items === null) {
    return (
      <main className="surface-narrow">
        <p className="text-center text-zinc-500">載入中…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="surface-narrow">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      </main>
    );
  }

  const total = items.reduce((sum, it) => sum + Number(it.variant.price) * it.quantity, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="page-title">購物車</h1>
      <p className="page-subtitle">調整數量後可前往結帳</p>

      {items.length === 0 ? (
        <div className="card mt-8 p-10 text-center shadow-soft">
          <p className="text-zinc-600">購物車目前是空的。</p>
          <Link href="/products" className="btn btn-accent mt-6 inline-flex">
            去逛逛商品
          </Link>
        </div>
      ) : (
        <>
          <ul className="card mt-8 divide-y divide-zinc-100 overflow-hidden shadow-soft">
            {items.map((it) => {
              const img = it.variant.product.images[0]?.url;
              const line = Number(it.variant.price) * it.quantity;
              return (
                <li key={it.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  {img && (
                    <Image
                      src={img}
                      alt=""
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] rounded-xl object-cover ring-1 ring-zinc-200/80"
                      unoptimized
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900">{it.variant.product.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {it.variant.name} · {it.variant.sku}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    <input
                      type="number"
                      min={0}
                      max={it.variant.stock}
                      className="input w-20 py-2 text-center"
                      value={it.quantity}
                      onChange={(e) => setQty(it.id, Number(e.target.value) || 0)}
                    />
                    <span className="price min-w-[5.5rem] text-right text-base">NT$ {line.toFixed(0)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="card mt-6 flex flex-col gap-4 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold text-zinc-900">
              合計 <span className="price text-xl">NT$ {total.toFixed(0)}</span>
            </p>
            {status === "authenticated" ? (
              <Link href="/checkout" className="btn btn-accent w-full sm:w-auto">
                結帳
              </Link>
            ) : (
              <Link href="/login?callbackUrl=/checkout" className="btn btn-accent w-full sm:w-auto">
                登入以結帳
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  );
}
