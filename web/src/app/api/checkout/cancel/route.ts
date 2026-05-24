import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { restorePendingOrderToCart } from "@/lib/order-restore";

const schema = z.object({ orderId: z.string().min(1) });

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
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, userId: session.user.id, status: OrderStatus.PENDING },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ ok: true });
  }
  await restorePendingOrderToCart(session.user.id, order);
  return NextResponse.json({ ok: true });
}
