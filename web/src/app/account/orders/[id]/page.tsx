import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const statusMap: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPING: "出貨中",
  COMPLETED: "完成",
  CANCELLED: "已取消",
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-800",
  PAID: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  SHIPPING: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80",
  COMPLETED: "bg-zinc-100 text-zinc-700",
  CANCELLED: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
};

type Props = { params: Promise<{ id: string }> };

export default async function AccountOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=" + encodeURIComponent(`/account/orders/${id}`));
  }
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  });
  if (!order) notFound();

  const linesSubtotal = order.items.reduce((s, it) => s + Number(it.price) * it.quantity, 0);
  const subtotalDisplay =
    order.subtotal != null ? order.subtotal.toString() : linesSubtotal.toFixed(0);
  const discountNum = Number(order.discountAmount);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/account/orders" className="text-sm font-medium text-orange-800 hover:underline">
        ← 返回訂單列表
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">訂單明細</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">{order.id}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[order.status]}`}
        >
          {statusMap[order.status]}
        </span>
      </div>

      <div className="card mt-8 space-y-4 p-6 shadow-soft">
        <h2 className="text-sm font-semibold text-zinc-900">收貨資訊</h2>
        <dl className="grid gap-2 text-sm text-zinc-700">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">收件人</dt>
            <dd className="text-right font-medium">{order.recipient}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">手機</dt>
            <dd className="text-right">{order.phone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">地址</dt>
            <dd className="text-right">
              {order.postalCode} {order.city}
              <br />
              {order.line1}
              {order.line2 ? (
                <>
                  <br />
                  {order.line2}
                </>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">下單時間</dt>
            <dd className="text-right">{order.createdAt.toLocaleString("zh-TW")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">付款方式</dt>
            <dd className="text-right">
              {order.paymentProvider === "stripe" ? "Stripe" : "示範／手動"}
            </dd>
          </div>
          {order.couponCode && (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">優惠碼</dt>
              <dd className="text-right font-mono text-xs">{order.couponCode}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="card mt-6 overflow-hidden shadow-soft">
        <h2 className="border-b border-zinc-100 px-6 py-4 text-sm font-semibold text-zinc-900">商品明細</h2>
        <ul className="divide-y divide-zinc-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4 text-sm">
              <span className="text-zinc-800">
                {it.title} × {it.quantity}
              </span>
              <span className="price tabular-nums">NT$ {(Number(it.price) * it.quantity).toFixed(0)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 text-sm">
          <span className="text-zinc-600">小計</span>
          <span className="price tabular-nums">NT$ {subtotalDisplay}</span>
        </div>
        {discountNum > 0 && (
          <div className="flex items-center justify-between px-6 py-2 text-sm text-orange-900">
            <span>折扣</span>
            <span className="tabular-nums">− NT$ {order.discountAmount.toString()}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4 text-base font-semibold">
          <span>訂單總額</span>
          <span className="price text-lg">NT$ {order.total.toString()}</span>
        </div>
      </div>
    </main>
  );
}
