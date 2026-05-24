import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const statusMap: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  PREPARING: "備餐中",
  READY: "可取餐",
  SHIPPING: "出貨中",
  COMPLETED: "完成",
  CANCELLED: "已取消",
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-800",
  PAID: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  PREPARING: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  READY: "bg-teal-50 text-teal-800 ring-1 ring-teal-200/80",
  SHIPPING: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80",
  COMPLETED: "bg-zinc-100 text-zinc-700",
  CANCELLED: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
};

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }
  const { new: newId } = await searchParams;
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {newId && (
        <div
          className="mb-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
        >
          訂單已建立。編號{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs ring-1 ring-emerald-200/60">
            {newId}
          </code>
        </div>
      )}
      <h1 className="page-title">我的訂單</h1>
      <p className="page-subtitle">查看訂單狀態與明細</p>

      {orders.length === 0 ? (
        <div className="card mt-8 p-10 text-center shadow-soft">
          <p className="text-zinc-600">
            尚無訂單。去{" "}
            <Link href="/products" className="font-medium text-orange-800 hover:underline">
              逛商品
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="card p-5 shadow-soft">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">{o.id}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[o.status]}`}
                  >
                    {statusMap[o.status]}
                  </span>
                  <Link href={`/account/orders/${o.id}`} className="btn btn-ghost btn-sm">
                    查看明細
                  </Link>
                </div>
              </div>
              <p className="text-sm text-zinc-600">
                {o.createdAt.toLocaleString("zh-TW")} ·{" "}
                <span className="price font-semibold">NT$ {o.total.toString()}</span> · {o.recipient}
              </p>
              <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span>
                      {it.title} × {it.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
