import { PrismaClient, UserRole, CouponType, StoreMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── 商店設定 ──────────────────────────────────────────────────────────────
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "T9FOX Store",
      mode: StoreMode.BOTH,
      currency: "TWD",
      timezone: "Asia/Taipei",
      businessHours: {
        mon: { open: "09:00", close: "21:00", closed: false },
        tue: { open: "09:00", close: "21:00", closed: false },
        wed: { open: "09:00", close: "21:00", closed: false },
        thu: { open: "09:00", close: "21:00", closed: false },
        fri: { open: "09:00", close: "22:00", closed: false },
        sat: { open: "10:00", close: "22:00", closed: false },
        sun: { open: "10:00", close: "20:00", closed: false },
      },
    },
  });

  // ── 帳號 ──────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@t9fox.local" },
    update: { password: adminPass, role: UserRole.ADMIN },
    create: {
      email: "admin@t9fox.local",
      name: "管理員",
      password: adminPass,
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

  // ── 桌位（餐廳模式示範）────────────────────────────────────────────────────
  if ((await prisma.table.count()) === 0) {
    const tables = ["A1", "A2", "A3", "B1", "B2", "C1", "外帶"].map((number, i) => ({
      number,
      label: number === "外帶" ? "外帶取餐區" : `${number} 號桌`,
      capacity: number === "外帶" ? 0 : i < 3 ? 2 : 4,
    }));
    await prisma.table.createMany({ data: tables });
    console.log(`已建立 ${tables.length} 張桌位。`);
  }

  // ── 商品與加點選項 ─────────────────────────────────────────────────────────
  if ((await prisma.product.count()) === 0) {
    // 電商分類
    const catApparel = await prisma.category.create({
      data: { name: "服飾配件", slug: "apparel", position: 1 },
    });
    const catLiving = await prisma.category.create({
      data: { name: "生活用品", slug: "living", position: 2 },
    });
    // 餐飲分類
    const catDrink = await prisma.category.create({
      data: { name: "飲品", slug: "drinks", position: 3 },
    });
    const catFood = await prisma.category.create({
      data: { name: "輕食", slug: "food", position: 4 },
    });

    // 電商商品
    await prisma.product.create({
      data: {
        title: "示範連帽衫",
        slug: "sample-hoodie",
        description: "自架商店的示範商品。",
        published: true,
        categoryId: catApparel.id,
        images: {
          create: [{ url: "https://picsum.photos/seed/t9hoodie/800/800", position: 0 }],
        },
        variants: {
          create: [
            { sku: "HOOD-S", name: "S", price: 1280, stock: 20 },
            { sku: "HOOD-M", name: "M", price: 1280, stock: 15 },
            { sku: "HOOD-L", name: "L", price: 1280, stock: 10 },
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
        categoryId: catLiving.id,
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

    // 餐飲商品（含加點選項）
    const drinkProduct = await prisma.product.create({
      data: {
        title: "珍珠奶茶",
        slug: "bubble-milk-tea",
        description: "招牌珍珠奶茶，可自選甜度與冰量。",
        published: true,
        categoryId: catDrink.id,
        images: {
          create: [{ url: "https://picsum.photos/seed/bbt/800/800", position: 0 }],
        },
        variants: {
          create: [
            { sku: "BBT-M", name: "中杯 500ml", price: 60, stock: 999 },
            { sku: "BBT-L", name: "大杯 700ml", price: 75, stock: 999 },
          ],
        },
      },
    });

    // 加點選項
    await prisma.productModifier.create({
      data: {
        name: "甜度",
        required: true,
        multiSelect: false,
        position: 0,
        productId: drinkProduct.id,
        options: {
          create: [
            { name: "全糖", price: 0, position: 0 },
            { name: "七分糖", price: 0, position: 1 },
            { name: "半糖", price: 0, position: 2 },
            { name: "三分糖", price: 0, position: 3 },
            { name: "無糖", price: 0, position: 4 },
          ],
        },
      },
    });

    await prisma.productModifier.create({
      data: {
        name: "冰量",
        required: true,
        multiSelect: false,
        position: 1,
        productId: drinkProduct.id,
        options: {
          create: [
            { name: "正常冰", price: 0, position: 0 },
            { name: "少冰", price: 0, position: 1 },
            { name: "去冰", price: 0, position: 2 },
            { name: "熱", price: 0, position: 3 },
          ],
        },
      },
    });

    await prisma.productModifier.create({
      data: {
        name: "加料",
        required: false,
        multiSelect: true,
        position: 2,
        productId: drinkProduct.id,
        options: {
          create: [
            { name: "珍珠", price: 10, position: 0 },
            { name: "椰果", price: 10, position: 1 },
            { name: "仙草", price: 10, position: 2 },
            { name: "布丁", price: 15, position: 3 },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        title: "厚片吐司",
        slug: "thick-toast",
        description: "現烤厚片，多種口味。",
        published: true,
        categoryId: catFood.id,
        images: {
          create: [{ url: "https://picsum.photos/seed/toast/800/800", position: 0 }],
        },
        variants: {
          create: [
            { sku: "TOAST-BUT", name: "奶油", price: 55, stock: 999 },
            { sku: "TOAST-PNB", name: "花生醬", price: 60, stock: 999 },
            { sku: "TOAST-JAM", name: "草莓果醬", price: 65, stock: 999 },
          ],
        },
      },
    });

    console.log("已建立示範商品、分類與加點選項。");
  } else {
    console.log("略過商品 seed（資料庫已有商品）。");
  }

  // ── 優惠碼 ────────────────────────────────────────────────────────────────
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
