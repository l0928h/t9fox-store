import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddToCart } from "./add-to-cart";
import { ProductGallery } from "@/components/ProductGallery";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, published: true },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { id: "asc" } },
      category: true,
    },
  });
  if (!product) notFound();

  const prices =
    product.variants.length > 0 ? product.variants.map((v) => Number(v.price)) : [];
  const minPriceNum = prices.length ? Math.min(...prices) : null;
  const showFrom =
    prices.length > 1 && new Set(prices.map((p) => Number(p.toFixed(2)))).size > 1;

  const galleryImages = product.images.map((img) => ({ url: img.url, id: img.id }));

  return (
    <main className="surface-page">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-orange-800/90 hover:text-orange-900"
      >
        <span aria-hidden>←</span> 返回商品列表
      </Link>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery title={product.title} images={galleryImages} />
        <div className="flex flex-col">
          {product.category && (
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-800/90">
              {product.category.name}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{product.title}</h1>
          {minPriceNum != null && (
            <p className="price mt-4 text-2xl">
              {showFrom ? `NT$ ${minPriceNum} 起` : `NT$ ${prices[0]}`}
            </p>
          )}
          <div className="mt-6">
            <p className="whitespace-pre-wrap leading-relaxed text-zinc-600">{product.description || " "}</p>
          </div>
          <div className="mt-8 border-t border-zinc-200 pt-8">
            <AddToCart
              variants={product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price.toString(),
                stock: v.stock,
              }))}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
