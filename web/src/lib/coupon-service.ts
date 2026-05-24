import { CouponType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type CouponApplyResult =
  | { ok: true; discount: Prisma.Decimal; couponId: string | null; couponCode: string | null }
  | { ok: false; error: string };

function roundMoney(d: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(d.toFixed(2));
}

export async function applyCouponToSubtotal(
  rawCode: string | undefined | null,
  subtotal: Prisma.Decimal
): Promise<CouponApplyResult> {
  if (!rawCode?.trim()) {
    return { ok: true, discount: new Prisma.Decimal(0), couponId: null, couponCode: null };
  }
  const code = rawCode.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return { ok: false, error: "優惠碼無效" };
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "優惠尚未開始" };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { ok: false, error: "優惠已過期" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "優惠碼已達使用上限" };
  }
  if (coupon.minAmount && subtotal.lessThan(coupon.minAmount)) {
    return { ok: false, error: "未達此優惠的低消門檻" };
  }

  let discount: Prisma.Decimal;
  if (coupon.type === CouponType.PERCENT) {
    discount = subtotal.mul(coupon.value).div(100);
    if (coupon.maxDiscount && discount.greaterThan(coupon.maxDiscount)) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.value;
  }
  if (discount.lessThan(0)) discount = new Prisma.Decimal(0);
  if (discount.greaterThan(subtotal)) discount = subtotal;
  discount = roundMoney(discount);

  return { ok: true, discount, couponId: coupon.id, couponCode: coupon.code };
}

