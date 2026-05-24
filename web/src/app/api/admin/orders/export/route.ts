import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { user: { select: { email: true, name: true } }, items: true },
  });
  const headers = [
    "id",
    "status",
    "createdAt",
    "paymentProvider",
    "subtotal",
    "discountAmount",
    "total",
    "couponCode",
    "userEmail",
    "userName",
    "recipient",
    "phone",
    "city",
    "postalCode",
    "line1",
    "line2",
    "items",
  ];
  const lines = orders.map((o) => {
    const items = o.items.map((it) => `${it.title} x${it.quantity} @${it.price}`).join("; ");
    const row = [
      o.id,
      o.status,
      o.createdAt.toISOString(),
      o.paymentProvider,
      o.subtotal != null ? o.subtotal.toString() : "",
      o.discountAmount.toString(),
      o.total.toString(),
      o.couponCode ?? "",
      o.user.email,
      o.user.name ?? "",
      o.recipient,
      o.phone,
      o.city,
      o.postalCode,
      o.line1,
      o.line2 ?? "",
      items,
    ];
    return row.map((x) => escapeCsv(String(x))).join(",");
  });
  const csv = "\ufeff" + headers.join(",") + "\n" + lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
