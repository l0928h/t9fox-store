import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, OrderStatus } from "@prisma/client";
import { applyCouponToSubtotal } from "@/lib/coupon-service";
import { getAppBaseUrl, getPaymentProvider, getStripeSecretKey } from "@/lib/payment-config";
import { restorePendingOrderToCart } from "@/lib/order-restore";
import Stripe from "stripe";

const checkoutSchema = z.object({
  recipient: z.string().min(1).max(200),
  phone: z.string().min(3).max(30),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().max(3).default("TW"),
  couponCode: z.string().max(64).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "地址資料不完整" }, { status: 400 });
  }
  const b = parsed.data;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
  }
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: { include: { product: true } } },
  });
  if (items.length === 0) {
    return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
  }
  for (const line of items) {
    if (line.quantity > line.variant.stock) {
      return NextResponse.json({ error: `庫存不足：${line.variant.sku}` }, { status: 400 });
    }
  }

  let subtotal = new Prisma.Decimal(0);
  for (const line of items) {
    subtotal = subtotal.add(line.variant.price.mul(line.quantity));
  }
  subtotal = new Prisma.Decimal(subtotal.toFixed(2));

  const applied = await applyCouponToSubtotal(b.couponCode, subtotal);
  if (!applied.ok) {
    return NextResponse.json({ error: applied.error }, { status: 400 });
  }
  const discountAmount = applied.discount;
  let total = subtotal.sub(discountAmount);
  if (total.lessThan(0)) total = new Prisma.Decimal(0);
  total = new Prisma.Decimal(total.toFixed(2));

  const provider = getPaymentProvider();
  const stripeKey = getStripeSecretKey();
  const useStripe = provider === "stripe" && !!stripeKey && total.greaterThan(0);

  const orderItemsData = items.map((c) => ({
    variantId: c.variantId,
    title: `${c.variant.product.title} / ${c.variant.name}`,
    price: c.variant.price,
    quantity: c.quantity,
  }));

  const commonAddress = {
    recipient: b.recipient,
    phone: b.phone,
    line1: b.line1,
    line2: b.line2 ?? null,
    city: b.city,
    postalCode: b.postalCode,
    country: b.country,
  };

  if (!useStripe) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId,
            status: OrderStatus.PAID,
            subtotal,
            discountAmount,
            total,
            couponId: applied.couponId,
            couponCode: applied.couponCode,
            paymentProvider: "demo",
            ...commonAddress,
            items: { create: orderItemsData },
          },
        });
        for (const c of items) {
          const v = await tx.productVariant.findUniqueOrThrow({ where: { id: c.variantId } });
          if (c.quantity > v.stock) {
            throw new Error("STOCK");
          }
          await tx.productVariant.update({
            where: { id: c.variantId },
            data: { stock: { decrement: c.quantity } },
          });
        }
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        if (applied.couponId) {
          await tx.coupon.update({
            where: { id: applied.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }
        return created;
      });
      return NextResponse.json({ id: order.id, mode: "demo" as const });
    } catch (e) {
      if (e instanceof Error && e.message === "STOCK") {
        return NextResponse.json({ error: "庫存不足" }, { status: 400 });
      }
      throw e;
    }
  }

  let pendingOrderId: string | null = null;
  try {
    const pending = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          total,
          couponId: applied.couponId,
          couponCode: applied.couponCode,
          paymentProvider: "stripe",
          ...commonAddress,
          items: { create: orderItemsData },
        },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });
    pendingOrderId = pending.id;

    const stripe = new Stripe(stripeKey!);
    const base = getAppBaseUrl();
    const amountTwd = Number(total.toFixed(0));
    if (!Number.isFinite(amountTwd) || amountTwd < 1) {
      throw new Error("INVALID_AMOUNT");
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "twd",
              unit_amount: amountTwd,
              product_data: {
                name: `T9FOX 訂單 ${pending.id.slice(0, 8)}…`,
              },
            },
          },
        ],
        success_url: `${base}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/checkout?cancelled=1&order=${pending.id}`,
        metadata: { orderId: pending.id, userId },
        client_reference_id: pending.id,
      },
      { idempotencyKey: `checkout-${pending.id}` }
    );

    await prisma.order.update({
      where: { id: pending.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    if (!checkoutSession.url) {
      throw new Error("NO_SESSION_URL");
    }

    return NextResponse.json({
      mode: "stripe" as const,
      checkoutUrl: checkoutSession.url,
      orderId: pending.id,
    });
  } catch (e) {
    if (pendingOrderId) {
      const order = await prisma.order.findUnique({
        where: { id: pendingOrderId },
        include: { items: true },
      });
      if (order) {
        await restorePendingOrderToCart(userId, order);
      }
    }
    if (e instanceof Error && e.message === "INVALID_AMOUNT") {
      return NextResponse.json({ error: "金額無效" }, { status: 400 });
    }
    return NextResponse.json({ error: "無法建立金流工作階段，請稍後再試" }, { status: 502 });
  }
}
