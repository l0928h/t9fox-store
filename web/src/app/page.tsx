import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { published: true },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: { take: 1, orderBy: { price: "asc" } } },
    }),
    prisma.category.findMany({
      where: { products: { some: { published: true } } },
      orderBy: { name: "asc" },
      take: 12,
    }),
  ]);

  return (
    <main className="surface-page">
      <section className="relative mb-12 overflow-hidden rounded-3xl border border-orange-200/50 bg-gradient-to-br from-orange-50 via-white to-amber-50/90 p-8 shadow-soft sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-700/90">示範商店</p>
          <h1 className="mt-3 page-title sm:text-4xl">歡迎來到 T9FOX 商店</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Next.js、Prisma、PostgreSQL 自架示範。瀏覽商品、加入購物車並完成結帳流程。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-accent">
              瀏覽全部商品
            </Link>
            <Link href="/cart" className="btn btn-ghost">
              查看購物車
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-zinc-900">依分類逛逛</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="inline-flex rounded-full border border-orange-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-orange-900 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">精選商品</h2>
          <p className="page-subtitle !mt-1">最新上架，點擊查看詳情</p>
        </div>
        <Link
          href="/products"
          className="hidden text-sm font-medium text-orange-800 hover:text-orange-900 sm:inline"
        >
          查看全部 →
        </Link>
      </div>

      <ul className="grid gap-6 sm:grid-cols-2">
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
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-400">無圖片</div>
                  )}
                </div>
                <div className="border-t border-zinc-100 p-4 sm:p-5">
                  <h3 className="font-semibold text-zinc-900 transition group-hover:text-orange-900">{p.title}</h3>
                  {minPrice != null && (
                    <p className="price mt-1 text-sm">NT$ {String(minPrice)} 起</p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
