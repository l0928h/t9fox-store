import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const variantPatch = z.object({
  id: z.string().optional(),
  sku: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
    .optional(),
  description: z.string().max(20000).optional(),
  published: z.boolean().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  variants: z.array(variantPatch).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { id: "asc" } }, category: true },
  });
  if (!product) return NextResponse.json({ error: "找不到商品" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料不正確", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "找不到商品" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      const data: Prisma.ProductUpdateInput = {};
      if (b.title !== undefined) data.title = b.title;
      if (b.slug !== undefined) data.slug = b.slug.toLowerCase();
      if (b.description !== undefined) data.description = b.description;
      if (b.published !== undefined) data.published = b.published;
      if (b.categoryId !== undefined) {
        data.category = b.categoryId ? { connect: { id: b.categoryId } } : { disconnect: true };
      }

      if (Object.keys(data).length > 0) {
        await tx.product.update({ where: { id }, data });
      }

      if (b.imageUrls) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (b.imageUrls.length > 0) {
          await tx.productImage.createMany({
            data: b.imageUrls.map((url, position) => ({ url, position, productId: id })),
          });
        }
      }

      if (b.variants) {
        for (const v of b.variants) {
          if (v.id) {
            const cur = await tx.productVariant.findFirst({ where: { id: v.id, productId: id } });
            if (!cur) continue;
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                name: v.name,
                price: new Prisma.Decimal(v.price),
                stock: v.stock,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                name: v.name,
                price: new Prisma.Decimal(v.price),
                stock: v.stock,
              },
            });
          }
        }
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "slug 或 SKU 與其他商品衝突" }, { status: 409 });
    }
    throw e;
  }
}
