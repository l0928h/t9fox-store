import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { KitchenStatus } from "@prisma/client";

async function isAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.role === "ADMIN";
}

// Returns active kitchen orders (PENDING + PREPARING + READY)
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await prisma.order.findMany({
    where: {
      kitchenStatus: { in: [KitchenStatus.PENDING, KitchenStatus.PREPARING, KitchenStatus.READY] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        include: { variant: { select: { name: true } } },
      },
      table: { select: { number: true, label: true } },
    },
  });

  return NextResponse.json(orders);
}
