import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CouponType, Prisma } from "@prisma/client";

const patchSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(CouponType).optional(),
  value: z.coerce.number().positive().optional(),
  minAmount: z.coerce.number().nonnegative().nullable().optional(),
  maxDiscount: z.coerce.number().nonnegative().nullable().optional(),
  startsAt: z.string().max(50).nullable().optional(),
  endsAt: z.string().max(50).nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const { id } = await params;
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "找不到" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料不正確" }, { status: 400 });
  }
  const b = parsed.data;
  const cur = await prisma.coupon.findUnique({ where: { id } });
  if (!cur) return NextResponse.json({ error: "找不到" }, { status: 404 });
  const nextType = b.type ?? cur.type;
  const nextValue = b.value ?? Number(cur.value);
  if (nextType === CouponType.PERCENT && nextValue > 100) {
    return NextResponse.json({ error: "百分比不可超過 100" }, { status: 400 });
  }
  let startsAt: Date | null | undefined;
  if (b.startsAt !== undefined) {
    if (!b.startsAt?.trim()) startsAt = null;
    else {
      const d = new Date(b.startsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "開始時間格式錯誤" }, { status: 400 });
      }
      startsAt = d;
    }
  }
  let endsAt: Date | null | undefined;
  if (b.endsAt !== undefined) {
    if (!b.endsAt?.trim()) endsAt = null;
    else {
      const d = new Date(b.endsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "結束時間格式錯誤" }, { status: 400 });
      }
      endsAt = d;
    }
  }
  try {
    await prisma.coupon.update({
      where: { id },
      data: {
        ...(b.code != null ? { code: b.code.trim().toUpperCase() } : {}),
        ...(b.description != null ? { description: b.description } : {}),
        ...(b.type != null ? { type: b.type } : {}),
        ...(b.value != null ? { value: new Prisma.Decimal(b.value) } : {}),
        ...(b.minAmount !== undefined
          ? {
              minAmount:
                b.minAmount != null && b.minAmount > 0 ? new Prisma.Decimal(b.minAmount) : null,
            }
          : {}),
        ...(b.maxDiscount !== undefined
          ? {
              maxDiscount:
                b.maxDiscount != null && b.maxDiscount > 0 ? new Prisma.Decimal(b.maxDiscount) : null,
            }
          : {}),
        ...(startsAt !== undefined ? { startsAt } : {}),
        ...(endsAt !== undefined ? { endsAt } : {}),
        ...(b.usageLimit !== undefined ? { usageLimit: b.usageLimit ?? null } : {}),
        ...(b.active !== undefined ? { active: b.active } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "優惠碼已存在" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
