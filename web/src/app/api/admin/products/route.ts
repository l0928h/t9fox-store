import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const variantIn = z.object({
  sku: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "slug 僅能使用英數與連字號"),
  description: z.string().max(20000).optional().default(""),
  published: z.boolean().optional().default(true),
  categoryId: z.string().min(1).nullable().optional(),
  imageUrls: z.array(z.string().url()).optional().default([]),
  variants: z.array(variantIn).min(1, "至少一個規格"),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    take: 500,
    include: {
      category: true,
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { orderBy: { price: "asc" }, take: 1 },
      _count: { select: { variants: true } },
    },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料不正確", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const categoryId = b.categoryId === null || b.categoryId === undefined ? null : b.categoryId;

  try {
    const product = await prisma.product.create({
      data: {
        title: b.title,
        slug: b.slug.toLowerCase(),
        description: b.description ?? "",
        published: b.published,
        categoryId,
        images: {
          create: b.imageUrls.map((url, position) => ({ url, position })),
        },
        variants: {
          create: b.variants.map((v) => ({
            sku: v.sku,
            name: v.name,
            price: new Prisma.Decimal(v.price),
            stock: v.stock,
          })),
        },
      },
    });
    return NextResponse.json({ id: product.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "slug 或 SKU 已存在" }, { status: 409 });
    }
    throw e;
  }
}
