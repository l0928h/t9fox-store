import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
// Returns table info + published products with variants & modifiers
export async function GET(_req: Request, { params }: { params: Promise<{ tableToken: string }> }) {
  const { tableToken } = await params;

  const table = await prisma.table.findUnique({ where: { qrToken: tableToken } });
  if (!table) return NextResponse.json({ error: "桌位不存在" }, { status: 404 });

  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: {
      products: {
        where: { published: true },
        orderBy: { createdAt: "asc" },
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          variants: { orderBy: { price: "asc" } },
          modifiers: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });

  // Also collect uncategorized products
  const uncategorized = await prisma.product.findMany({
    where: { published: true, categoryId: null },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { orderBy: { price: "asc" } },
      modifiers: {
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
      },
    },
  });

  return NextResponse.json({ table, categories, uncategorized });
}
