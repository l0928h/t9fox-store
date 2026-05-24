import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { randomUUID } from "crypto";

export const CART_COOKIE = "t9fox_sid";

export async function getCartSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const sid = randomUUID();
  jar.set(CART_COOKIE, sid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return sid;
}

export async function getOrCreateCart(userId: string | undefined) {
  if (userId) {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }
    return cart;
  }
  const sessionId = await getCartSessionId();
  let cart = await prisma.cart.findUnique({ where: { sessionId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { sessionId } });
  }
  return cart;
}

/**
 * 登入後將訪客購物車合併進會員購物車，並清除訪客 Cookie。
 */
export async function mergeGuestCartIntoUser(userId: string) {
  const jar = await cookies();
  const sessionId = jar.get(CART_COOKIE)?.value;
  if (!sessionId) return { merged: false as const };

  const guestCart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    jar.delete(CART_COOKIE);
    return { merged: false as const };
  }

  let userCart = await prisma.cart.findUnique({ where: { userId } });
  if (!userCart) {
    userCart = await prisma.cart.create({ data: { userId } });
  }
  const userCartId = userCart.id;

  await prisma.$transaction(async (tx) => {
    for (const item of guestCart.items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant || variant.stock < 1) continue;

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCartId, variantId: item.variantId } },
      });
      const desiredQty = item.quantity;
      if (existing) {
        const nextQty = Math.min(existing.quantity + desiredQty, variant.stock);
        await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
      } else {
        const qty = Math.min(desiredQty, variant.stock);
        if (qty > 0) {
          await tx.cartItem.create({
            data: { cartId: userCartId, variantId: item.variantId, quantity: qty },
          });
        }
      }
    }
    await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });
    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  jar.delete(CART_COOKIE);
  return { merged: true as const };
}
