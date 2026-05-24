import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { applyCouponToSubtotal } from "@/lib/coupon-service";

const schema = z.object({
  couponCode: z.string().max(64).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
  if (!cart) {
    return NextResponse.json({
      subtotal: "0",
      discount: "0",
      total: "0",
      itemCount: 0,
      couponError: null as string | null,
    });
  }
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: true },
  });
  let subtotal = new Prisma.Decimal(0);
  for (const line of items) {
    subtotal = subtotal.add(line.variant.price.mul(line.quantity));
  }
  subtotal = new Prisma.Decimal(subtotal.toFixed(2));

  const applied = await applyCouponToSubtotal(parsed.data.couponCode, subtotal);
  if (!applied.ok) {
    return NextResponse.json({
      subtotal: subtotal.toFixed(2),
      discount: "0",
      total: subtotal.toFixed(2),
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      couponError: applied.error,
    });
  }
  let total = subtotal.sub(applied.discount);
  if (total.lessThan(0)) total = new Prisma.Decimal(0);
  total = new Prisma.Decimal(total.toFixed(2));

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  return NextResponse.json({
    subtotal: subtotal.toFixed(2),
    discount: applied.discount.toFixed(2),
    total: total.toFixed(2),
    itemCount,
    couponError: null as string | null,
  });
}
