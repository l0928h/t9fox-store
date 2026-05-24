import { prisma } from "./prisma";
import { getOrCreateCart } from "./cart-helpers";

export async function restorePendingOrderToCart(
  userId: string,
  order: { id: string; items: { variantId: string; quantity: number }[] }
) {
  const cart = await getOrCreateCart(userId);
  for (const line of order.items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: line.variantId } });
    if (!variant) continue;
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: line.variantId } },
    });
    const qty = line.quantity;
    if (existing) {
      const next = Math.min(existing.quantity + qty, variant.stock);
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: next } });
    } else {
      const q = Math.min(qty, variant.stock);
      if (q > 0) {
        await prisma.cartItem.create({
          data: { cartId: cart.id, variantId: line.variantId, quantity: q },
        });
      }
    }
  }
  await prisma.order.delete({ where: { id: order.id } });
}
