import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { KitchenStatus } from "@prisma/client";

async function isAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.role === "ADMIN";
}

const VALID_STATUSES: KitchenStatus[] = [
  KitchenStatus.PENDING,
  KitchenStatus.PREPARING,
  KitchenStatus.READY,
  KitchenStatus.SERVED,
];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { kitchenStatus } = await req.json();

  if (!VALID_STATUSES.includes(kitchenStatus)) {
    return NextResponse.json({ error: "無效狀態" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { kitchenStatus },
  });

  return NextResponse.json(order);
}
