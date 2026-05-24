"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string };

type VariantRow = { id?: string; sku: string; name: string; price: string; stock: string };

type ProductPayload = {
  title: string;
  slug: string;
  description: string;
  published: boolean;
  categoryId: string;
  imageUrls: string[];
  variants: { id?: string; sku: string; name: string; price: number; stock: number }[];
};

export function AdminProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEdit = !!productId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([
    { sku: "", name: "", price: "0", stock: "0" },
  ]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) return;
    const data: Category[] = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/products/${productId}`);
      if (!res.ok) {
        if (!cancelled) setLoadErr("無法載入商品");
        return;
      }
      const p = await res.json();
      if (cancelled) return;
      setTitle(p.title ?? "");
      setSlug(p.slug ?? "");
      setDescription(p.description ?? "");
      setPublished(!!p.published);
      setCategoryId(p.categoryId ?? "");
      setImageUrlsText((p.images as { url: string }[] | undefined)?.map((i) => i.url).join("\n") ?? "");
      const vs = (p.variants as { id: string; sku: string; name: string; price: string; stock: number }[]) ?? [];
      setVariants(
        vs.length > 0
          ? vs.map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name,
              price: String(v.price),
              stock: String(v.stock),
            }))
          : [{ sku: "", name: "", price: "0", stock: "0" }]
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function addVariantRow() {
    setVariants((v) => [...v, { sku: "", name: "", price: "0", stock: "0" }]);
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function removeVariant(i: number) {
    setVariants((rows) => rows.filter((_, j) => j !== i));
  }

  function buildPayload(): ProductPayload | null {
    const imageUrls = imageUrlsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const vRows = variants
      .map((v) => ({
        id: v.id,
        sku: v.sku.trim(),
        name: v.name.trim(),
        price: Number(v.price),
        stock: Number.parseInt(v.stock, 10),
      }))
      .filter((v) => v.sku && v.name);
    if (!title.trim() || !slug.trim()) {
      setErr("請填寫標題與 slug");
      return null;
    }
    if (vRows.length === 0) {
      setErr("至少一個有效規格（SKU / 名稱）");
      return null;
    }
    for (const v of vRows) {
      if (!Number.isFinite(v.price) || v.price <= 0) {
        setErr("價格需為正數");
        return null;
      }
      if (!Number.isFinite(v.stock) || v.stock < 0) {
        setErr("庫存需為 0 以上整數");
        return null;
      }
    }
    setErr(null);
    return {
      title: title.trim(),
      slug: slug.trim(),
      description,
      published,
      categoryId,
      imageUrls,
      variants: vRows,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    setLoading(true);
    setErr(null);
    try {
      if (isEdit) {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            slug: payload.slug,
            description: payload.description,
            published: payload.published,
            categoryId: payload.categoryId || null,
            imageUrls: payload.imageUrls,
            variants: payload.variants,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || "更新失敗");
          return;
        }
        router.push("/admin/products");
        router.refresh();
        return;
      }
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          slug: payload.slug,
          description: payload.description,
          published: payload.published,
          categoryId: payload.categoryId || null,
          imageUrls: payload.imageUrls,
          variants: payload.variants.map(({ sku, name, price, stock }) => ({ sku, name, price, stock })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "建立失敗");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && loadErr) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {loadErr}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-6 shadow-soft sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">商品名稱</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Slug（網址用，英數與連字號）</label>
          <input className="input font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div>
          <label className="label">分類</label>
          <select
            className="input cursor-pointer"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">未分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">描述</label>
          <textarea
            className="input min-h-[120px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
            />
            上架（顧客可見）
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="label">圖片網址（每行一張，HTTPS）</label>
          <textarea
            className="input min-h-[100px] resize-y font-mono text-xs"
            placeholder="https://..."
            value={imageUrlsText}
            onChange={(e) => setImageUrlsText(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label !normal-case">規格與庫存</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addVariantRow}>
            新增列
          </button>
        </div>
        <div className="space-y-3">
          {variants.map((row, i) => (
            <div
              key={row.id ?? `new-${i}`}
              className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 sm:grid-cols-12 sm:items-end"
            >
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs text-zinc-500">SKU</label>
                <input
                  className="input py-2 font-mono text-xs"
                  value={row.sku}
                  onChange={(e) => updateVariant(i, { sku: e.target.value })}
                />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs text-zinc-500">名稱</label>
                <input
                  className="input py-2"
                  value={row.name}
                  onChange={(e) => updateVariant(i, { name: e.target.value })}
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs text-zinc-500">價格</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input py-2"
                  value={row.price}
                  onChange={(e) => updateVariant(i, { price: e.target.value })}
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs text-zinc-500">庫存</label>
                <input
                  type="number"
                  min="0"
                  className="input py-2"
                  value={row.stock}
                  onChange={(e) => updateVariant(i, { stock: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex justify-end sm:col-span-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-red-700 hover:bg-red-50"
                  onClick={() => removeVariant(i)}
                  disabled={variants.length <= 1}
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={loading} className="btn btn-accent">
          {loading ? "儲存中…" : isEdit ? "更新商品" : "建立商品"}
        </button>
        <Link href="/admin/products" className="btn btn-ghost">
          返回列表
        </Link>
      </div>
    </form>
  );
}
