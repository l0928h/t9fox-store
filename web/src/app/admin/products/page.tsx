"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

type Row = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  category: { name: string } | null;
  images: { url: string }[];
  variants: { price: unknown }[];
  _count?: { variants: number };
};

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/products");
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

  if (err || rows === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-zinc-500">{err ?? "載入中…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">商品管理</h1>
          <p className="page-subtitle">建立、編輯商品與規格（示範後台）</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-accent">
          新增商品
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {rows.map((p) => {
          const thumb = p.images[0]?.url;
          const minP = p.variants[0]?.price;
          const variantCount = p._count?.variants ?? p.variants.length;
          return (
            <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4 shadow-soft sm:flex-nowrap">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                {thumb ? (
                  <Image src={thumb} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">無圖</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900">{p.title}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  {p.slug} · {p.category?.name ?? "未分類"} · {variantCount} 規格
                </p>
                {minP != null && <p className="price mt-1 text-sm">NT$ {String(minP)} 起</p>}
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.published ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {p.published ? "上架" : "下架"}
                </span>
                <Link href={`/admin/products/${p.id}/edit`} className="btn btn-ghost btn-sm">
                  編輯
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && <p className="mt-8 text-zinc-600">尚無商品，請新增。</p>}
    </main>
  );
}
