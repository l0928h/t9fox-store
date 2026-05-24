import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CouponType, Prisma } from "@prisma/client";

const createSchema = z.object({
  code: z.string().min(1).max(64),
  description: z.string().max(500).optional().default(""),
  type: z.nativeEnum(CouponType),
  value: z.coerce.number().positive(),
  minAmount: z.coerce.number().nonnegative().nullable().optional(),
  maxDiscount: z.coerce.number().nonnegative().nullable().optional(),
  startsAt: z.string().max(50).nullable().optional(),
  endsAt: z.string().max(50).nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料不正確", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  if (b.type === CouponType.PERCENT && b.value > 100) {
    return NextResponse.json({ error: "百分比不可超過 100" }, { status: 400 });
  }
  const startsAt = b.startsAt?.trim() ? new Date(b.startsAt) : null;
  const endsAt = b.endsAt?.trim() ? new Date(b.endsAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "開始時間格式錯誤" }, { status: 400 });
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "結束時間格式錯誤" }, { status: 400 });
  }
  try {
    const c = await prisma.coupon.create({
      data: {
        code: b.code.trim().toUpperCase(),
        description: b.description ?? "",
        type: b.type,
        value: new Prisma.Decimal(b.value),
        minAmount:
          b.minAmount != null && b.minAmount > 0 ? new Prisma.Decimal(b.minAmount) : null,
        maxDiscount:
          b.maxDiscount != null && b.maxDiscount > 0 ? new Prisma.Decimal(b.maxDiscount) : null,
        startsAt,
        endsAt,
        usageLimit: b.usageLimit ?? null,
        active: b.active,
      },
    });
    return NextResponse.json({ id: c.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "優惠碼已存在" }, { status: 409 });
    }
    throw e;
  }
}
