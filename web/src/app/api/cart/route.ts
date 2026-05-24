import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart-helpers";
import { prisma } from "@/lib/prisma";

const addSchema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) });

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } },
  });
  return NextResponse.json({ cartId: cart.id, items });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }
  const { variantId, quantity } = parsed.data;
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || variant.stock < quantity) {
    return NextResponse.json({ error: "庫存不足或無此規格" }, { status: 400 });
  }
  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  if (existing) {
    const nextQty = existing.quantity + quantity;
    if (nextQty > variant.stock) {
      return NextResponse.json({ error: "庫存不足" }, { status: 400 });
    }
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const body = await req.json().catch(() => null);
  const schema = z.object({ itemId: z.string(), quantity: z.number().int().min(0) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: parsed.data.itemId, cart: { id: cart.id } },
    include: { variant: true },
  });
  if (!item) return NextResponse.json({ error: "找不到項目" }, { status: 404 });
  if (parsed.data.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.quantity > item.variant.stock) {
    return NextResponse.json({ error: "庫存不足" }, { status: 400 });
  }
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.data.quantity } });
  return NextResponse.json({ ok: true });
}
