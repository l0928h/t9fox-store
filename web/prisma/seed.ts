import { PrismaClient, UserRole, CouponType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@t9fox.local" },
    update: { password, role: UserRole.ADMIN },
    create: {
      email: "admin@t9fox.local",
      name: "管理員",
      password,
      role: UserRole.ADMIN,
    },
  });

  const customerPass = await bcrypt.hash("user1234", 10);
  await prisma.user.upsert({
    where: { email: "user@t9fox.local" },
    update: { password: customerPass },
    create: {
      email: "user@t9fox.local",
      name: "測試會員",
      password: customerPass,
      role: UserRole.CUSTOMER,
    },
  });

  if ((await prisma.product.count()) === 0) {
    const cat = await prisma.category.create({ data: { name: "服飾配件", slug: "apparel" } });
    const cat2 = await prisma.category.create({ data: { name: "生活用品", slug: "living" } });

    await prisma.product.create({
      data: {
        title: "示範連帽衫",
        slug: "sample-hoodie",
        description: "自架商店的示範商品。",
        published: true,
        categoryId: cat.id,
        images: {
          create: [{ url: "https://picsum.photos/seed/t9hoodie/800/800", position: 0 }],
        },
        variants: {
          create: [
            { sku: "HOOD-S", name: "S", price: 1280, stock: 20 },
            { sku: "HOOD-M", name: "M", price: 1280, stock: 15 },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        title: "示範馬克杯",
        slug: "sample-mug",
        description: "另一個示範商品。",
        published: true,
        categoryId: cat2.id,
        images: {
          create: [
            { url: "https://picsum.photos/seed/t9mug/800/800", position: 0 },
            { url: "https://picsum.photos/seed/t9mug2/800/800", position: 1 },
          ],
        },
        variants: {
          create: [{ sku: "MUG-01", name: "預設", price: 350, stock: 50 }],
        },
      },
    });

    await prisma.product.create({
      data: {
        title: "示範帆布袋",
        slug: "sample-tote",
        description: "多圖示範：可於商品頁切換預覽。",
        published: true,
        categoryId: cat2.id,
        images: {
          create: [
            { url: "https://picsum.photos/seed/t9tote1/800/800", position: 0 },
            { url: "https://picsum.photos/seed/t9tote2/800/800", position: 1 },
            { url: "https://picsum.photos/seed/t9tote3/800/800", position: 2 },
          ],
        },
        variants: {
          create: [
            { sku: "TOTE-S", name: "小", price: 420, stock: 30 },
            { sku: "TOTE-L", name: "大", price: 520, stock: 25 },
          ],
        },
      },
    });
    console.log("已建立示範商品與分類。");
  } else {
    console.log("略過商品 seed（資料庫已有商品）。");
  }

  if ((await prisma.coupon.count()) === 0) {
    await prisma.coupon.createMany({
      data: [
        {
          code: "WELCOME10",
          description: "全站 9 折（上限 NT$200）",
          type: CouponType.PERCENT,
          value: 10,
          maxDiscount: 200,
          active: true,
        },
        {
          code: "SAVE50",
          description: "折抵 NT$50（滿 NT$500）",
          type: CouponType.FIXED,
          value: 50,
          minAmount: 500,
          active: true,
        },
      ],
    });
    console.log("已建立示範優惠碼：WELCOME10、SAVE50。");
  }

  console.log("Seed 完成。管理員 admin@t9fox.local / admin1234 ；會員 user@t9fox.local / user1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
