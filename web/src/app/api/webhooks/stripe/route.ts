import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeWebhookSecret } from "@/lib/payment-config";
import { OrderStatus } from "@prisma/client";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook 未設定" }, { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "缺少簽章" }, { status: 400 });
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "簽章驗證失敗" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId || session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, status: OrderStatus.PENDING },
          include: { items: true },
        });
        if (!order) {
          return;
        }
        if (order.stripeSessionId && order.stripeSessionId !== session.id) {
          return;
        }
        for (const line of order.items) {
          const v = await tx.productVariant.findUniqueOrThrow({ where: { id: line.variantId } });
          if (line.quantity > v.stock) {
            throw new Error("STOCK");
          }
        }
        for (const line of order.items) {
          await tx.productVariant.update({
            where: { id: line.variantId },
            data: { stock: { decrement: line.quantity } },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });
        if (order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }
      });
    } catch (e) {
      if (e instanceof Error && e.message === "STOCK") {
        await prisma.order.updateMany({
          where: { id: orderId, status: OrderStatus.PENDING },
          data: { status: OrderStatus.CANCELLED },
        });
      } else {
        throw e;
      }
    }
  }

  return NextResponse.json({ received: true });
}
