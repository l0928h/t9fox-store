import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function buildProductsHref(query: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
}) {
  const p = new URLSearchParams();
  if (query.q?.trim()) p.set("q", query.q.trim());
  if (query.category?.trim()) p.set("category", query.category.trim());
  if (query.sort && query.sort !== "new") p.set("sort", query.sort);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  const s = p.toString();
  return s ? `/products?${s}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categorySlug = sp.category?.trim() ?? "";
  const sort = sp.sort === "old" || sp.sort === "title" ? sp.sort : "new";
  const pageRaw = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { published: true };
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "old" ? { createdAt: "asc" } : sort === "title" ? { title: "asc" } : { createdAt: "desc" };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(pageRaw, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: (pageSafe - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      category: true,
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { take: 1, orderBy: { price: "asc" } },
    },
  });

  return (
    <main className="surface-page">
      <div className="mb-8">
        <h1 className="page-title">所有商品</h1>
        <p className="page-subtitle">搜尋、依分類篩選，或依排序瀏覽</p>
      </div>

      <div className="card mb-8 p-4 shadow-soft sm:p-5">
        <form action="/products" method="GET" className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="q" className="label">
              關鍵字
            </label>
            <input id="q" name="q" type="search" className="input" placeholder="商品名稱或描述…" defaultValue={q} />
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="category" className="label">
              分類
            </label>
            <select id="category" name="category" className="input cursor-pointer" defaultValue={categorySlug}>
              <option value="">全部分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label htmlFor="sort" className="label">
              排序
            </label>
            <select id="sort" name="sort" className="input cursor-pointer" defaultValue={sort}>
              <option value="new">最新上架</option>
              <option value="old">最舊優先</option>
              <option value="title">名稱 A→Z</option>
            </select>
          </div>
          <button type="submit" className="btn btn-accent w-full sm:w-auto">
            套用
          </button>
        </form>
      </div>

      <p className="mb-4 text-sm text-zinc-600">
        共 <span className="font-medium text-zinc-900">{total}</span> 件
        {totalPages > 1 && (
          <>
            {" "}
            · 第 {pageSafe} / {totalPages} 頁
          </>
        )}
      </p>

      {products.length === 0 ? (
        <div className="card p-12 text-center text-zinc-600 shadow-soft">
          找不到符合條件的商品。
          <div className="mt-4">
            <Link href="/products" className="btn btn-ghost btn-sm">
              清除篩選
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const minPrice = p.variants[0]?.price;
              return (
                <li key={p.id}>
                  <Link href={`/products/${p.slug}`} className="group card-interactive block overflow-hidden">
                    <div className="relative aspect-square bg-gradient-to-br from-zinc-100 to-zinc-50">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-400">無圖片</div>
                      )}
                    </div>
                    <div className="border-t border-zinc-100 p-4">
                      {p.category && (
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-orange-800/80">
                          {p.category.name}
                        </p>
                      )}
                      <h2 className="font-semibold text-zinc-900 transition group-hover:text-orange-900">{p.title}</h2>
                      {minPrice != null && <p className="price mt-1 text-sm">NT$ {String(minPrice)} 起</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="分頁">
              {pageSafe > 1 && (
                <Link
                  href={buildProductsHref({ q, category: categorySlug, sort, page: pageSafe - 1 })}
                  className="btn btn-ghost btn-sm"
                >
                  上一頁
                </Link>
              )}
              {pageSafe < totalPages && (
                <Link
                  href={buildProductsHref({ q, category: categorySlug, sort, page: pageSafe + 1 })}
                  className="btn btn-ghost btn-sm"
                >
                  下一頁
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
