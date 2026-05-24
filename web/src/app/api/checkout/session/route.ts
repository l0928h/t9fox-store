import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeSecretKey } from "@/lib/payment-config";
import Stripe from "stripe";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "缺少 session_id" }, { status: 400 });
  }
  const key = getStripeSecretKey();
  if (!key) {
    return NextResponse.json({ error: "Stripe 未設定" }, { status: 500 });
  }
  const stripe = new Stripe(key);
  const cs = await stripe.checkout.sessions.retrieve(sessionId);
  const orderId = cs.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "無訂單資訊" }, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, status: true, stripeSessionId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  }
  if (order.stripeSessionId && order.stripeSessionId !== sessionId) {
    return NextResponse.json({ error: "工作階段不符" }, { status: 400 });
  }
  return NextResponse.json({ orderId: order.id, status: order.status });
}
