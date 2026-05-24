import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, published: true },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { id: "asc" } },
      category: true,
    },
  });
  if (!product) return NextResponse.json({ error: "找不到商品" }, { status: 404 });
  return NextResponse.json(product);
}
