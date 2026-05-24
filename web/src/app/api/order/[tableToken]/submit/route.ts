import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderType, KitchenStatus, OrderStatus } from "@prisma/client";

interface SubmitItem {
  variantId: string;
  quantity: number;
  modifiers?: { modifierId: string; optionId: string; name: string; price: number }[];
  notes?: string;
}

// Public endpoint — table QR ordering, no login required
export async function POST(req: Request, { params }: { params: Promise<{ tableToken: string }> }) {
  const { tableToken } = await params;

  const table = await prisma.table.findUnique({ where: { qrToken: tableToken } });
  if (!table) return NextResponse.json({ error: "桌位不存在" }, { status: 404 });

  const { items, notes }: { items: SubmitItem[]; notes?: string } = await req.json();
  if (!items?.length) return NextResponse.json({ error: "請至少選擇一項商品" }, { status: 400 });

  // Fetch variants for price calculation
  const variantIds = items.map(i => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { title: true } } },
  });
  const variantMap = new Map(variants.map(v => [v.id, v]));

  // Validate all variants exist
  for (const item of items) {
    if (!variantMap.has(item.variantId)) {
      return NextResponse.json({ error: `商品不存在：${item.variantId}` }, { status: 400 });
    }
  }

  // Calculate total (base price + modifier prices)
  let total = 0;
  for (const item of items) {
    const variant = variantMap.get(item.variantId)!;
    const basePrice = Number(variant.price);
    const modifierTotal = (item.modifiers ?? []).reduce((s, m) => s + m.price, 0);
    total += (basePrice + modifierTotal) * item.quantity;
  }

  const order = await prisma.order.create({
    data: {
      orderType: OrderType.DINE_IN,
      tableId: table.id,
      tableNumber: table.number,
      status: OrderStatus.PAID,
      kitchenStatus: KitchenStatus.PENDING,
      total,
      subtotal: total,
      notes: notes ?? null,
      paymentProvider: "table",
      items: {
        create: items.map(item => {
          const variant = variantMap.get(item.variantId)!;
          const basePrice = Number(variant.price);
          const modifierTotal = (item.modifiers ?? []).reduce((s, m) => s + m.price, 0);
          return {
            variantId: item.variantId,
            title: `${variant.product.title}${variant.name !== "預設" ? ` · ${variant.name}` : ""}`,
            price: basePrice + modifierTotal,
            quantity: item.quantity,
            modifiers: item.modifiers ?? [],
            notes: item.notes ?? null,
          };
        }),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
